import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { Screening, Snapshot } from "../domain/screening";
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
const HORIZON_DAYS = 21;
const COLD_BATCH = 25;
const MOVIE_CONCURRENCY = 3;
const CACHE_PATH = join(process.cwd(), "data/ritz.cache.json");
const SNAPSHOT_PATH = join(process.cwd(), "data/ritz.json");

const WEEKDAY: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const DAY_PAGES: { path: string; filter: string }[] = [
  { path: "/now-showing", filter: "today" },
  { path: "/now-showing/tomorrow", filter: "tomorrow" },
  ...Object.keys(WEEKDAY).map((day) => ({
    path: `/now-showing/${day}`,
    filter: day,
  })),
];

type MovieIndex = {
  slug: string;
  name: string;
  duration?: number;
  releaseYmd?: string;
  nowShowing: boolean;
  comingThisWeek: boolean;
};

type RitzCache = {
  cursor: number;
  slugs: Record<string, string[]>;
};

type ApiMovie = {
  slug?: string;
  name?: string;
  duration?: number;
  releaseDate?: string;
  hidden?: boolean;
  nowShowing?: boolean;
  comingThisWeek?: boolean;
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

function ymdFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

/** Movie-page day tab: Today, Tomorrow, Thursday, or `Sat 19 Sept`. */
function parseDayLabel(label: string, today: string): string | null {
  const text = label.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === "today") return today;
  if (lower === "tomorrow") return addDays(today, 1);
  if (lower in WEEKDAY) {
    const target = WEEKDAY[lower];
    const todayDow = sydneyWeekdayMon0(today);
    const delta = (target - todayDow + 7) % 7;
    return addDays(today, delta);
  }
  const dated = text.match(
    /^(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(\d{1,2})\s+([a-z]+)$/i,
  );
  if (!dated) return null;
  const month = MONTHS[dated[2].toLowerCase()];
  if (!month) return null;
  const day = Number(dated[1]);
  const year = Number(today.slice(0, 4));
  let ymd = ymdFromParts(year, month, day);
  if (!ymd) return null;
  if (ymd < today) ymd = ymdFromParts(year + 1, month, day);
  return ymd;
}

function movieSlugFromHref(href: string): string | null {
  const path = href.replace(/&amp;/g, "&").split(/[?#]/)[0];
  const m = path.match(/^\/movies\/([^/]+)$/);
  return m?.[1] ?? null;
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

function screeningFromLink(
  $: CheerioAPI,
  el: Element,
  ymd: string,
  runtimeMins?: number,
): Screening | null {
  const $a = $(el);
  const rawTitle = ($a.attr("data-name") || "").trim();
  if (!rawTitle) return null;
  const { title, year } = yearFromTitle(rawTitle);
  const parsed = parseTime($a.find(".Time").first().text());
  if (!parsed) return null;
  const startsAt = sydneyLocalToIso(ymd, parsed.hour, parsed.minute);
  const attrs = $a
    .find(".Attribute")
    .map((_, node) => $(node).text().trim())
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
  return {
    id,
    sourceId: SOURCE_ID,
    venueId: VENUE_ID,
    title,
    startsAt,
    bookingUrl,
    format: attrs.length ? attrs.join(", ") : undefined,
    year,
    runtimeMins,
  };
}

function parseDay(
  html: string,
  ymd: string,
): { screenings: Screening[]; slugs: string[] } {
  const $ = cheerio.load(html);
  const screenings: Screening[] = [];
  const slugs: string[] = [];
  const seenSlug = new Set<string>();

  $(".Movie").each((_, movie) => {
    const $movie = $(movie);
    const href =
      $movie.find(".Title a").first().attr("href") ||
      $movie.find("a[href^='/movies/']").first().attr("href") ||
      "";
    const slug = movieSlugFromHref(href);
    if (slug && !seenSlug.has(slug)) {
      seenSlug.add(slug);
      slugs.push(slug);
    }
    const fallbackTitle = $movie.find(".Title a").first().text().trim();
    $movie.find("a.sessions-link").each((__, link) => {
      const $a = $(link);
      if (!$a.attr("data-name") && fallbackTitle) {
        $a.attr("data-name", fallbackTitle);
      }
      const s = screeningFromLink($, link, ymd);
      if (s) screenings.push(s);
    });
  });

  return { screenings, slugs };
}

function parseMoviePage(
  html: string,
  today: string,
  runtimeMins?: number,
): Screening[] {
  const $ = cheerio.load(html);
  const labels = $(".Days a.btn-primary")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const lists = $("ul.Sessions").toArray();
  const n = Math.min(labels.length, lists.length);
  const out: Screening[] = [];
  for (let i = 0; i < n; i++) {
    const ymd = parseDayLabel(labels[i], today);
    if (!ymd) continue;
    $(lists[i])
      .find("a.sessions-link")
      .each((_, link) => {
        const s = screeningFromLink($, link, ymd, runtimeMins);
        if (s) out.push(s);
      });
  }
  return out;
}

function loadCache(): RitzCache {
  try {
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as RitzCache;
    if (parsed && typeof parsed.cursor === "number" && parsed.slugs) {
      return parsed;
    }
  } catch {
    // first run
  }
  return { cursor: 0, slugs: {} };
}

function saveCache(cache: RitzCache) {
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

function loadPreviousScreenings(): Screening[] {
  try {
    const parsed = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;
    return Array.isArray(parsed.screenings) ? parsed.screenings : [];
  } catch {
    return [];
  }
}

async function fetchMovieIndex(): Promise<MovieIndex[]> {
  const res = await fetch(`${BASE}/api/movies`, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Ritz /api/movies ${res.status}`);
  }
  const body = (await res.json()) as ApiMovie[];
  if (!Array.isArray(body)) {
    throw new Error("Ritz /api/movies was not a list");
  }
  const out: MovieIndex[] = [];
  for (const row of body) {
    if (row.hidden) continue;
    const slug = row.slug?.trim();
    const name = row.name?.trim();
    if (!slug || !name) continue;
    const release = row.releaseDate?.slice(0, 10);
    out.push({
      slug,
      name,
      duration:
        typeof row.duration === "number" && row.duration > 0
          ? row.duration
          : undefined,
      releaseYmd: release && /^\d{4}-\d{2}-\d{2}$/.test(release) ? release : undefined,
      nowShowing: Boolean(row.nowShowing),
      comingThisWeek: Boolean(row.comingThisWeek),
    });
  }
  return out;
}

function isHot(movie: MovieIndex, today: string, cachedIds: string[]): boolean {
  if (movie.nowShowing || movie.comingThisWeek) return true;
  if (cachedIds.length) return true;
  if (!movie.releaseYmd) return false;
  const end = addDays(today, HORIZON_DAYS);
  return movie.releaseYmd >= today && movie.releaseYmd <= end;
}

async function mapPool<T, R>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) || 0 }, () => worker()),
  );
  return out;
}

export const ritz: SourceAdapter = {
  id: SOURCE_ID,
  kind: "chain",
  async fetch() {
    const today = sydneyYmd();
    const seen = new Set<string>();
    const screenings: Screening[] = [];
    const daySlugs = new Set<string>();

    for (const page of DAY_PAGES) {
      const ymd = filterToYmd(page.filter, today);
      const html = await fetchPage(page.path);
      const parsed = parseDay(html, ymd);
      for (const slug of parsed.slugs) daySlugs.add(slug);
      for (const s of parsed.screenings) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        screenings.push(s);
      }
    }

    const cache = loadCache();
    const previous = loadPreviousScreenings();
    const previousById = new Map(previous.map((s) => [s.id, s]));
    let index: MovieIndex[] = [];
    try {
      index = await fetchMovieIndex();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`ritz: movie index failed (${message}); kept day tabs`);
    }

    const bySlug = new Map(index.map((m) => [m.slug, m]));
    const fetchSlugs: string[] = [];
    const fetchSet = new Set<string>();
    const addSlug = (slug: string) => {
      if (fetchSet.has(slug)) return;
      fetchSet.add(slug);
      fetchSlugs.push(slug);
    };

    for (const movie of index) {
      if (isHot(movie, today, cache.slugs[movie.slug] ?? [])) addSlug(movie.slug);
    }
    for (const slug of daySlugs) addSlug(slug);

    const cold = index
      .map((m) => m.slug)
      .filter((slug) => !fetchSet.has(slug))
      .sort();
    let cursor = cache.cursor;
    if (cold.length) {
      cursor = ((cursor % cold.length) + cold.length) % cold.length;
      const n = Math.min(COLD_BATCH, cold.length);
      for (let i = 0; i < n; i++) addSlug(cold[(cursor + i) % cold.length]);
      cursor = (cursor + n) % cold.length;
    } else {
      cursor = 0;
    }

    const movieIds = new Map<string, string[]>();
    await mapPool(fetchSlugs, MOVIE_CONCURRENCY, async (slug) => {
      try {
        const html = await fetchPage(`/movies/${slug}`);
        const meta = bySlug.get(slug);
        const rows = parseMoviePage(html, today, meta?.duration);
        const ids: string[] = [];
        for (const s of rows) {
          ids.push(s.id);
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          screenings.push(s);
        }
        movieIds.set(slug, ids);
      } catch {
        movieIds.set(slug, cache.slugs[slug] ?? []);
      }
    });

    const nextSlugs: Record<string, string[]> = { ...cache.slugs };
    const indexSlugs = new Set(index.map((m) => m.slug));
    for (const slug of Object.keys(nextSlugs)) {
      if (index.length && !indexSlugs.has(slug)) delete nextSlugs[slug];
    }
    for (const [slug, ids] of movieIds) {
      nextSlugs[slug] = ids;
    }

    for (const slug of Object.keys(nextSlugs)) {
      if (fetchSet.has(slug)) continue;
      for (const id of nextSlugs[slug] ?? []) {
        const s = previousById.get(id);
        if (!s || seen.has(s.id)) continue;
        seen.add(s.id);
        screenings.push(s);
      }
    }

    saveCache({ cursor, slugs: nextSlugs });

    if (screenings.length === 0) {
      throw new Error("Ritz returned no screenings");
    }
    return screenings;
  },
};
