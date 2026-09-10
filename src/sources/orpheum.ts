import type { Screening } from "../domain/screening";
import { sydneyLocalToIso } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BASE = "https://www.orpheum.com.au";
const VENUE_ID = "orpheum-cremorne";
const SOURCE_ID = "orpheum";
const UA = "rr-movies ingest (public Sydney listings calendar)";
const SKIP_ATTR = new Set(["AD", "HI", "CCAP", "CC", "NFT", "CAP", "OC"]);

type SessionTime = {
  _id?: string;
  date?: string;
  time?: string;
  bookingLink?: string;
  attributes?: { shortName?: string }[];
};

type Movie = {
  title?: string;
  url?: string;
  duration?: string | number;
  releaseYear?: number;
  sessionTimes?: SessionTime[];
};

function parseTime(label: string): { hour: number; minute: number } | null {
  const m = label
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const ap = m[3].toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function formatFromAttrs(attrs: { shortName?: string }[] | undefined) {
  const labels = (attrs ?? [])
    .map((a) => a.shortName?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name) => !SKIP_ATTR.has(name.toUpperCase()));
  return labels.length ? labels.join(", ") : undefined;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Orpheum ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

function moviesToScreenings(movies: Movie[], seen: Set<string>): Screening[] {
  const out: Screening[] = [];
  for (const movie of movies) {
    const title = movie.title?.trim();
    if (!title) continue;
    const runtimeRaw = Number(movie.duration);
    const runtimeMins =
      Number.isFinite(runtimeRaw) && runtimeRaw > 0 ? runtimeRaw : undefined;
    const year =
      movie.releaseYear && movie.releaseYear > 1880
        ? movie.releaseYear
        : undefined;

    for (const session of movie.sessionTimes ?? []) {
      const ymd = session.date?.trim();
      const parsed = session.time ? parseTime(session.time) : null;
      if (!ymd || !parsed) continue;
      const startsAt = sydneyLocalToIso(ymd, parsed.hour, parsed.minute);
      const externalId =
        session._id?.trim() ||
        session.bookingLink?.match(/showtimes\/([^/]+)/)?.[1];
      const id = externalId
        ? `${SOURCE_ID}:${externalId}`
        : `${SOURCE_ID}:${VENUE_ID}|${title}|${startsAt}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        sourceId: SOURCE_ID,
        venueId: VENUE_ID,
        title,
        startsAt,
        bookingUrl: session.bookingLink?.trim() || `${BASE}/movie/${movie.url ?? ""}`,
        format: formatFromAttrs(session.attributes),
        year,
        runtimeMins,
      });
    }
  }
  return out;
}

export const orpheum: SourceAdapter = {
  id: SOURCE_ID,
  kind: "ticketing",
  async fetch() {
    const [playing, soon] = await Promise.all([
      fetchJson<Movie[]>("/api/movie/playing-now"),
      fetchJson<Movie[]>("/api/movie/coming-soon"),
    ]);
    const seen = new Set<string>();
    const screenings = [
      ...moviesToScreenings(playing, seen),
      ...moviesToScreenings(soon, seen),
    ];
    if (screenings.length === 0) {
      throw new Error("Orpheum returned no screenings");
    }
    return screenings;
  },
};
