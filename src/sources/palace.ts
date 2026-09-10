import type { Screening } from "../domain/screening";
import type { SourceAdapter } from "./types";

const BASE = "https://www.palacecinemas.com.au";
const TIX = "https://buy.palacecinemas.com.au";
const SOURCE_ID = "palace";
const UA = "rr-movies ingest (public Sydney listings calendar)";

const CINEMAS: { slug: string; venueId: string }[] = [
  { slug: "palace-norton-street", venueId: "palace-norton-street" },
  { slug: "palace-central-sydney", venueId: "palace-central-chippendale" },
  { slug: "palace-moore-park", venueId: "palace-moore-park" },
];

const SKIP_FORMAT = new Set([
  "audio description session",
  "closed captioning available",
  "hearing impaired",
  "no free tickets",
  "recliner",
  "movie club",
  "babes in arms",
  "golden years",
  "ad",
  "cc",
  "ccap",
  "hi",
  "nft",
  "cap",
  "oc",
]);

type PalaceSession = {
  date?: string;
  sessionId?: string;
  cinemaId?: string;
  displayAttributeText?: string | null;
  isSpecialEvent?: boolean;
  sessionInfo?: string[];
};

type PalaceFilm = {
  title?: string;
  slug?: string;
  runTime?: string;
  releaseDateUtc?: string;
  sessions?: PalaceSession[];
};

type NextData = {
  props?: {
    pageProps?: {
      sessions?: PalaceFilm[];
    };
  };
};

function runtimeMins(runTime: string | undefined): number | undefined {
  const m = runTime?.match(/(\d+)\s*min/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n > 0 ? n : undefined;
}

function yearFromRelease(iso: string | undefined): number | undefined {
  const y = iso?.slice(0, 4);
  if (!y || !/^\d{4}$/.test(y)) return undefined;
  const n = Number(y);
  return n >= 1900 && n <= 2100 ? n : undefined;
}

function formatLabel(session: PalaceSession): string | undefined {
  const labels: string[] = [];
  const attr = session.displayAttributeText?.trim();
  if (attr) labels.push(attr);
  for (const info of session.sessionInfo ?? []) {
    const t = info.trim();
    if (t) labels.push(t);
  }
  if (session.isSpecialEvent) labels.push("Special Event");
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const name of labels) {
    const key = name.toLowerCase();
    if (SKIP_FORMAT.has(key) || seen.has(key)) continue;
    seen.add(key);
    kept.push(name);
  }
  return kept.length ? kept.join(", ") : undefined;
}

function toScreenings(venueId: string, films: PalaceFilm[]): Screening[] {
  const out: Screening[] = [];
  for (const film of films) {
    const title = film.title?.trim();
    if (!title) continue;
    const year = yearFromRelease(film.releaseDateUtc);
    const runtime = runtimeMins(film.runTime);
    for (const session of film.sessions ?? []) {
      const startsAt = session.date?.trim();
      const sessionId = session.sessionId?.trim();
      const cinemaId = session.cinemaId?.trim();
      if (!startsAt || !sessionId || Number.isNaN(Date.parse(startsAt))) {
        continue;
      }
      out.push({
        id: `${SOURCE_ID}:${sessionId}`,
        sourceId: SOURCE_ID,
        venueId,
        title,
        startsAt,
        bookingUrl: cinemaId
          ? `${TIX}/?cinema=${encodeURIComponent(cinemaId)}&session=${encodeURIComponent(sessionId)}`
          : `${BASE}/cinemas/${CINEMAS.find((c) => c.venueId === venueId)?.slug ?? ""}`,
        format: formatLabel(session),
        year,
        runtimeMins: runtime,
      });
    }
  }
  return out;
}

function parseNextData(html: string): PalaceFilm[] {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) {
    throw new Error("missing NEXT_DATA");
  }
  const data = JSON.parse(match[1]) as NextData;
  const films = data.props?.pageProps?.sessions;
  if (!Array.isArray(films)) {
    throw new Error("missing sessions");
  }
  return films;
}

async function fetchCinema(slug: string): Promise<PalaceFilm[]> {
  const res = await fetch(`${BASE}/cinemas/${slug}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`${slug} ${res.status}`);
  }
  return parseNextData(await res.text());
}

export const palace: SourceAdapter = {
  id: SOURCE_ID,
  kind: "chain",
  async fetch() {
    const results = await Promise.allSettled(
      CINEMAS.map(async ({ slug, venueId }) => ({
        venueId,
        films: await fetchCinema(slug),
      })),
    );

    const screenings: Screening[] = [];
    const seen = new Set<string>();
    let ok = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "rejected") {
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        errors.push(message);
        continue;
      }
      ok += 1;
      for (const screening of toScreenings(
        result.value.venueId,
        result.value.films,
      )) {
        if (seen.has(screening.id)) continue;
        seen.add(screening.id);
        screenings.push(screening);
      }
    }

    if (ok === 0) {
      throw new Error(`Palace fetch failed (${errors.join("; ")})`);
    }
    if (screenings.length === 0) {
      throw new Error("Palace returned no screenings");
    }
    if (errors.length) {
      console.error(`palace: partial (${errors.join("; ")})`);
    }
    return screenings;
  },
};
