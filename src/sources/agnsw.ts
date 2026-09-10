import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import type { Screening } from "../domain/screening";
import { sydneyLocalToIso } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BASE = "https://www.artgallery.nsw.gov.au";
const HUB = "/whats-on/cinema/";
const VENUE_ID = "agnsw-domain";
const SOURCE_ID = "agnsw";
const UA = "rr-movies ingest (public Sydney listings calendar)";

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

const SERIES_HREF = /\/whats-on\/events\/(cinema-[a-z0-9-]+)/i;

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`AGNSW ${path} ${res.status}`);
  }
  return res.text();
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").replace(/([^\s])Introduced /g, "$1 Introduced ").trim();
}

function textOf($el: { text: () => string }): string {
  return collapse($el.text());
}

function parseYmd(label: string): string | null {
  const m = label
    .trim()
    .match(
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i,
    );
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

function parseClock(raw: string, fallbackMeridiem?: string): { hour: number; minute: number } | null {
  const m = raw.trim().match(/^(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const ap = (m[3] || fallbackMeridiem || "").toLowerCase();
  if (!ap) return null;
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

/** "2.30–4.05pm", "10.15am–12.25pm", "2pm", "1–3pm" → start clock. */
function parseStartTime(label: string): { hour: number; minute: number } | null {
  const cleaned = label.trim().replace(/\s+/g, " ");
  const range = cleaned.split(/\s*[–—-]\s*/);
  const startRaw = range[0]?.trim();
  const endRaw = range[1]?.trim();
  if (!startRaw) return null;
  const endMeridiem = endRaw?.match(/(am|pm)\s*$/i)?.[1];
  return parseClock(startRaw, endMeridiem);
}

function yearFrom(text: string): number | undefined {
  const m = text.match(/,\s*((?:19|20)\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function runtimeFrom(text: string): number | undefined {
  const hm = text.match(/(\d+)\s*hours?,\s*(\d+)\s*minutes/i);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const min = text.match(/(\d+)\s*min\b/i);
  return min ? Number(min[1]) : undefined;
}

function formatFrom(text: string): string | undefined {
  const found = text.match(/\[?(35mm|16mm|70mm|Q&A)\]?/gi);
  if (!found) return undefined;
  const uniq = [...new Set(found.map((s) => s.replace(/[[\]]/g, "")))];
  return uniq.length ? uniq.join(", ") : undefined;
}

function ticketId(href: string | undefined): string | undefined {
  const m = href?.match(/tickets\.artgallery\.nsw\.gov\.au\/events\/([0-9a-f-]+)/i);
  return m?.[1];
}

function screeningId(externalId: string, title: string, startsAt: string): string {
  if (externalId) return `${SOURCE_ID}:${externalId}:${startsAt}`;
  return `${SOURCE_ID}:${createHash("sha1").update(`${VENUE_ID}|${title}|${startsAt}`).digest("hex").slice(0, 12)}`;
}

function pushScreening(
  out: Screening[],
  seen: Set<string>,
  row: {
    title: string;
    ymd: string;
    timeLabel: string;
    bookingUrl?: string;
    externalId?: string;
    year?: number;
    runtimeMins?: number;
    format?: string;
  },
) {
  const title = collapse(row.title);
  const clock = parseStartTime(row.timeLabel);
  if (!title || !clock) return;
  const startsAt = sydneyLocalToIso(row.ymd, clock.hour, clock.minute);
  const id = screeningId(row.externalId ?? "", title, startsAt);
  if (seen.has(id)) return;
  seen.add(id);
  out.push({
    id,
    sourceId: SOURCE_ID,
    venueId: VENUE_ID,
    title,
    startsAt,
    bookingUrl: row.bookingUrl,
    format: row.format,
    year: row.year,
    runtimeMins: row.runtimeMins,
  });
}

function parseSeriesPage(html: string, pageUrl: string): Screening[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: Screening[] = [];
  const items = $("li.eventSeriesList-item");

  if (items.length === 0) {
    const title = textOf($(".eventDetails-title").first());
    const summary = $(".eventDetails-dateSummary").first();
    const lines = summary
      .find("p")
      .html()
      ?.split(/<br\s*\/?>/i)
      .map((s) => collapse($.load(`<div>${s}</div>`).text()))
      .filter(Boolean) ?? [];
    const ymd = lines[0] ? parseYmd(lines[0]) : null;
    const timeLabel = lines[1] || "";
    const href = $(".eventDetails-bookButton a[href]").first().attr("href");
    const details = textOf($(".eventDetails").first());
    if (title && ymd && timeLabel) {
      pushScreening(out, seen, {
        title,
        ymd,
        timeLabel,
        bookingUrl: href || pageUrl,
        externalId: ticketId(href),
        year: yearFrom(details),
        runtimeMins: runtimeFrom(textOf($(".eventDetails-duration").first()) || details),
        format: formatFrom(`${title} ${details}`),
      });
    }
    return out;
  }

  items.each((_, item) => {
    const $item = $(item);
    const title = textOf($item.find(".eventSeriesList-title").first());
    const subtitle = textOf($item.find(".eventSeriesList-subtitle").first());
    const body = textOf($item.find(".eventSeriesList-text").first());
    const blob = `${title} ${subtitle} ${body}`;
    const year = yearFrom(blob);
    const runtimeMins = runtimeFrom(blob);
    const format = formatFrom(blob);
    const datoid = $item.attr("data-datoid")?.trim();
    const slug = $item.attr("id")?.trim();
    const instances = $item.find(".eventSeriesList-eventInstance");
    const blocks = instances.length ? instances : $item.find(".eventSeriesList-dates").parent();
    blocks.each((__, inst) => {
      const $inst = $(inst);
      const spans = $inst
        .find(".eventSeriesList-dates span")
        .map((___, el) => textOf($(el)))
        .get()
        .filter(Boolean);
      const ymd = spans[0] ? parseYmd(spans[0]) : null;
      const timeLabel = spans[1] || "";
      if (!ymd || !timeLabel) return;
      const href = $inst.find(".eventSeriesList-bookingLink a[href]").first().attr("href");
      pushScreening(out, seen, {
        title,
        ymd,
        timeLabel,
        bookingUrl: href || (slug ? `${pageUrl}#${slug}` : pageUrl),
        externalId: ticketId(href) || (datoid ? `${datoid}:${ymd}T${timeLabel}` : undefined),
        year,
        runtimeMins,
        format,
      });
    });
  });

  return out;
}

function seriesPaths(hubHtml: string): string[] {
  const $ = cheerio.load(hubHtml);
  const seen = new Set<string>();
  const paths: string[] = [];
  $("a[href]").each((_, a) => {
    const href = ($(a).attr("href") || "").replace(/&amp;/g, "&");
    const m = href.match(SERIES_HREF);
    if (!m) return;
    const path = `/whats-on/events/${m[1]}`;
    if (seen.has(path)) return;
    seen.add(path);
    paths.push(path);
  });
  return paths;
}

export const agnsw: SourceAdapter = {
  id: SOURCE_ID,
  kind: "institution",
  async fetch() {
    const hub = await fetchHtml(HUB);
    if (!/cin[eé]math[eè]que/i.test(hub) && !hub.includes("whats-on/events/cinema-")) {
      throw new Error("AGNSW cinema hub did not look like the listings page");
    }
    const paths = seriesPaths(hub);
    if (paths.length === 0) {
      return [];
    }
    const seen = new Set<string>();
    const screenings: Screening[] = [];
    for (const path of paths) {
      const html = await fetchHtml(path);
      for (const s of parseSeriesPage(html, `${BASE}${path}`)) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        screenings.push(s);
      }
    }
    return screenings;
  },
};
