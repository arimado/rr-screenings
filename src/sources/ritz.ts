import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { Screening } from "../domain/screening";
import {
  addDays,
  sydneyLocalToIso,
  sydneyWeekdayMon0,
  sydneyYmd,
} from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BASE = "https://www.ritzcinemas.com.au";
const VENUE_ID = "ritz-randwick";
const SOURCE_ID = "ritz";
const UA = "rr-movies ingest (public Sydney listings calendar)";

const DAY_PAGES: { path: string; filter: string }[] = [
  { path: "/now-showing", filter: "today" },
  { path: "/now-showing/tomorrow", filter: "tomorrow" },
  { path: "/now-showing/saturday", filter: "saturday" },
  { path: "/now-showing/sunday", filter: "sunday" },
  { path: "/now-showing/monday", filter: "monday" },
  { path: "/now-showing/tuesday", filter: "tuesday" },
  { path: "/now-showing/wednesday", filter: "wednesday" },
];

const WEEKDAY: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function filterToYmd(filter: string, today: string): string {
  if (filter === "today") return today;
  if (filter === "tomorrow") return addDays(today, 1);
  const target = WEEKDAY[filter];
  if (target == null) return today;
  const todayDow = sydneyWeekdayMon0(today);
  let delta = (target - todayDow + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(today, delta);
}

function parseTime(label: string): { hour: number; minute: number } | null {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3].toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function yearFromTitle(title: string): { title: string; year?: number } {
  const m = title.trim().match(/^(.*)\((\d{4})\)\s*$/);
  if (!m) return { title: title.trim() };
  return { title: m[1].trim(), year: Number(m[2]) };
}

async function fetchPage(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Ritz ${path} ${res.status}`);
  }
  return res.text();
}

function parseDay(html: string, ymd: string): Screening[] {
  const $ = cheerio.load(html);
  const out: Screening[] = [];

  $(".Movie").each((_, movie) => {
    const $movie = $(movie);
    const fallbackTitle = $movie.find(".Title a").first().text().trim();

    $movie.find("a.sessions-link").each((__, link) => {
      const $a = $(link);
      const rawTitle = ($a.attr("data-name") || fallbackTitle).trim();
      if (!rawTitle) return;
      const { title, year } = yearFromTitle(rawTitle);
      const timeLabel = $a.find(".Time").first().text().trim();
      const parsed = parseTime(timeLabel);
      if (!parsed) return;
      const startsAt = sydneyLocalToIso(ymd, parsed.hour, parsed.minute);
      const attrs = $a
        .find(".Attribute")
        .map((___, el) => $(el).text().trim())
        .get()
        .filter(Boolean);
      const externalId = $a.attr("data-id")?.trim();
      const href = ($a.attr("href") || "").replace(/&amp;/g, "&");
      const bookingUrl = href.startsWith("http")
        ? href
        : href
          ? `${BASE}${href}`
          : undefined;
      const id = externalId
        ? `${SOURCE_ID}:${externalId}`
        : `${SOURCE_ID}:${createHash("sha1")
            .update(`${VENUE_ID}|${title}|${startsAt}`)
            .digest("hex")
            .slice(0, 12)}`;
      out.push({
        id,
        sourceId: SOURCE_ID,
        venueId: VENUE_ID,
        title,
        startsAt,
        bookingUrl,
        format: attrs.length ? attrs.join(", ") : undefined,
        year,
      });
    });
  });

  return out;
}

export const ritz: SourceAdapter = {
  id: SOURCE_ID,
  kind: "chain",
  async fetch() {
    const today = sydneyYmd();
    const seen = new Set<string>();
    const screenings: Screening[] = [];

    for (const page of DAY_PAGES) {
      const ymd = filterToYmd(page.filter, today);
      const html = await fetchPage(page.path);
      for (const s of parseDay(html, ymd)) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        screenings.push(s);
      }
    }

    if (screenings.length === 0) {
      throw new Error("Ritz returned no screenings");
    }
    return screenings;
  },
};
