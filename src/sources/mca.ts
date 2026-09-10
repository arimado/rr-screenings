import { createHash } from "node:crypto";
import type { Screening } from "../domain/screening";
import { sydneyLocalToIso, sydneyYmd } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BASE = "https://www.mca.com.au";
const LIST = `${BASE}/api/query-whats-on/?show=films&on=all-upcoming`;
const VENUE_ID = "mca-the-rocks";
const SOURCE_ID = "mca";
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

const SKIP_STATUS = /finished|cancel/i;

type WhatsOnEvent = {
  title?: string;
  url?: string;
};

type WhatsOnResponse = {
  events?: WhatsOnEvent[];
};

type EventInstance = {
  date?: string;
  time?: string;
  status?: string;
  call_to_action_url?: string;
};

type EventPageData = {
  type?: string;
  page_fields?: {
    title?: string;
    url?: string;
    callToActionUrl?: string;
    pricing?: string;
    instances?: EventInstance[] | null;
  };
};

async function fetchJson(url: string): Promise<WhatsOnResponse> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`MCA whats-on ${res.status}`);
  }
  return (await res.json()) as WhatsOnResponse;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`MCA ${url} ${res.status}`);
  }
  return res.text();
}

function windowApiData(html: string): EventPageData | null {
  const idx = html.indexOf("windowApiData");
  if (idx < 0) return null;
  const brace = html.indexOf("{", idx);
  if (brace < 0) return null;
  try {
    return jsonObjectAt(html, brace) as EventPageData;
  } catch {
    return null;
  }
}

function jsonObjectAt(source: string, start: number): unknown {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(source.slice(start, i + 1));
      }
    }
  }
  throw new Error("unterminated JSON");
}

function slugFromUrl(url: string): string {
  const path = new URL(url, BASE).pathname.replace(/\/+$/, "");
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  return slug;
}

function ticketUrl(raw?: string): string | undefined {
  const m = raw?.match(/https:\/\/tix\.mca\.com\.au\/events\/[0-9a-f-]+/i);
  return m?.[0];
}

function parseYmd(label: string, today: string): string | null {
  const m = label
    .trim()
    .match(
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/i,
    );
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  const day = String(Number(m[1])).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  if (m[3]) return `${m[3]}-${mm}-${day}`;
  const thisYear = today.slice(0, 4);
  const candidate = `${thisYear}-${mm}-${day}`;
  if (candidate >= today) return candidate;
  return `${Number(thisYear) + 1}-${mm}-${day}`;
}

function parseClock(
  raw: string,
  fallbackMeridiem?: string,
): { hour: number; minute: number } | null {
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

/** "5 to 9pm", "5–9pm", "6.30pm", "10am" → start clock. */
function parseStartTime(label: string): { hour: number; minute: number } | null {
  const cleaned = label.trim().replace(/\s+/g, " ");
  const range = cleaned.split(/\s*(?:to|[–—-])\s*/i);
  const startRaw = range[0]?.trim();
  const endRaw = range[1]?.trim();
  if (!startRaw) return null;
  const endMeridiem = endRaw?.match(/(am|pm)\s*$/i)?.[1];
  return parseClock(startRaw, endMeridiem);
}

function screeningId(slug: string, title: string, startsAt: string): string {
  if (slug) return `${SOURCE_ID}:${slug}:${startsAt}`;
  return `${SOURCE_ID}:${createHash("sha1").update(`${VENUE_ID}|${title}|${startsAt}`).digest("hex").slice(0, 12)}`;
}

function parseEventPage(html: string, pageUrl: string, today: string): Screening[] {
  const data = windowApiData(html);
  const fields = data?.page_fields;
  if (!data || !fields) return [];
  if (data.type && data.type !== "events.EventPage") return [];
  const title = fields.title?.replace(/\s+/g, " ").trim();
  const instances = fields.instances;
  if (!title || !Array.isArray(instances) || instances.length === 0) return [];

  const pageBooking =
    fields.callToActionUrl?.trim() ||
    ticketUrl(fields.pricing) ||
    fields.url ||
    pageUrl;
  const slug = slugFromUrl(fields.url || pageUrl);
  const out: Screening[] = [];
  const seen = new Set<string>();

  for (const inst of instances) {
    if (SKIP_STATUS.test(inst.status ?? "")) continue;
    const ymd = inst.date ? parseYmd(inst.date, today) : null;
    const clock = inst.time ? parseStartTime(inst.time) : null;
    if (!ymd || !clock) continue;
    const startsAt = sydneyLocalToIso(ymd, clock.hour, clock.minute);
    const id = screeningId(slug, title, startsAt);
    if (seen.has(id)) continue;
    seen.add(id);
    const bookingUrl = inst.call_to_action_url?.trim() || pageBooking;
    out.push({
      id,
      sourceId: SOURCE_ID,
      venueId: VENUE_ID,
      title,
      startsAt,
      bookingUrl,
    });
  }
  return out;
}

export const mca: SourceAdapter = {
  id: SOURCE_ID,
  kind: "institution",
  async fetch() {
    const body = await fetchJson(LIST);
    const events = body.events ?? [];
    if (!Array.isArray(body.events)) {
      throw new Error("MCA whats-on did not look like the listings feed");
    }
    const urls: string[] = [];
    const seenUrl = new Set<string>();
    for (const event of events) {
      const url = event.url?.trim();
      if (!url || seenUrl.has(url)) continue;
      seenUrl.add(url);
      urls.push(url);
    }
    if (urls.length === 0) return [];

    const today = sydneyYmd();
    const screenings: Screening[] = [];
    const seen = new Set<string>();
    let ok = 0;
    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        ok++;
        for (const s of parseEventPage(html, url, today)) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          screenings.push(s);
        }
      } catch {
        // one bad event page must not blank the rest
      }
    }
    if (ok === 0) {
      throw new Error("MCA film pages all failed");
    }
    return screenings;
  },
};
