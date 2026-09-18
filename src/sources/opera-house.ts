import * as cheerio from "cheerio";
import type { Screening } from "../domain/screening";
import { sydneyLocalToIso } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BASE = "https://www.sydneyoperahouse.com";
const HUB = "/cinema";
const VENUE_ID = "opera-house-bennelong-point";
const SOURCE_ID = "opera-house";
const UA = "rr-movies ingest (public Sydney listings calendar)";
const MAX_HUB_PAGES = 10;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Opera House ${path} ${res.status}`);
  }
  return res.text();
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** "Thursday, 29 October 2026" → "2026-10-29". */
function parseYmd(label: string): string | null {
  const m = label
    .trim()
    .match(
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i,
    );
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

/** "6:00pm" → start clock. */
function parseClock(raw: string): { hour: number; minute: number } | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3].toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function screeningId(slug: string, startsAt: string): string {
  return `${SOURCE_ID}:${slug}:${startsAt}`;
}

function hubPage(html: string): { paths: string[]; nextPath: string | null } {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const paths: string[] = [];
  $("div.card--event a.card__link[href]").each((_, a) => {
    const href = $(a).attr("href")?.trim();
    // Cinema events aren't always under /cinema/ — some sit behind a
    // sub-brand path (e.g. /hellhouse/angels-egg) but still surface here
    // as a "Cinema" category card.
    if (!href || !/^\/[^/]/.test(href)) return;
    if (seen.has(href)) return;
    seen.add(href);
    paths.push(href);
  });
  const nextHref = $(".pager__item--next a[href]").first().attr("href")?.trim();
  const nextPath = nextHref ? (nextHref.startsWith("?") ? `${HUB}${nextHref}` : nextHref) : null;
  return { paths, nextPath };
}

function parseEventPage(html: string, path: string): Screening[] {
  const $ = cheerio.load(html);
  const h1 = $("h1").first().clone();
  h1.find("small").remove();
  const title = collapse(h1.text());
  if (!title) return [];

  const slug = path.replace(/^\/(?:cinema\/)?/, "").replace(/\/$/, "");
  const bookingUrl = `${BASE}${path}`;
  const out: Screening[] = [];
  const seen = new Set<string>();

  $("table.accordion-panel__table--performances tbody tr").each((_, tr) => {
    const cells = $(tr)
      .find("td.performance__cell")
      .map((__, td) => collapse($(td).text()))
      .get();
    const ymd = cells[0] ? parseYmd(cells[0]) : null;
    const clock = cells[1] ? parseClock(cells[1]) : null;
    if (!ymd || !clock) return;
    const startsAt = sydneyLocalToIso(ymd, clock.hour, clock.minute);
    const id = screeningId(slug, startsAt);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      sourceId: SOURCE_ID,
      venueId: VENUE_ID,
      title,
      startsAt,
      bookingUrl,
    });
  });

  return out;
}

export const operaHouse: SourceAdapter = {
  id: SOURCE_ID,
  kind: "institution",
  async fetch() {
    const paths = new Set<string>();
    let next: string | null = HUB;
    let pages = 0;
    while (next && pages < MAX_HUB_PAGES) {
      const html = await fetchHtml(next);
      const { paths: found, nextPath } = hubPage(html);
      for (const p of found) paths.add(p);
      next = nextPath;
      pages++;
    }
    if (paths.size === 0) {
      throw new Error("Opera House cinema hub returned no events");
    }

    const screenings: Screening[] = [];
    const seen = new Set<string>();
    let ok = 0;
    for (const path of paths) {
      try {
        const html = await fetchHtml(path);
        ok++;
        for (const s of parseEventPage(html, path)) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          screenings.push(s);
        }
      } catch {
        // one bad event page must not blank the rest
      }
    }
    if (ok === 0) {
      throw new Error("Opera House event pages all failed");
    }
    return screenings;
  },
};
