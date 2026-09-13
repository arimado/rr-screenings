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

function showtimeId(session: SessionTime): string | undefined {
  return session.bookingLink?.match(/showtimes\/([^/]+)/)?.[1]?.trim();
}

function mergeScreening(existing: Screening, next: Screening) {
  if (existing.year == null && next.year != null) existing.year = next.year;
  if (!existing.format && next.format) existing.format = next.format;
  if (existing.runtimeMins == null && next.runtimeMins != null) {
    existing.runtimeMins = next.runtimeMins;
  }
  if (!existing.bookingUrl && next.bookingUrl) {
    existing.bookingUrl = next.bookingUrl;
  }
}

function moviesToScreenings(
  movies: Movie[],
  byId: Map<string, Screening>,
  slots: Set<string>,
) {
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
      // Booking showtime ids are stable across playing-now and coming-soon.
      // Session `_id` is not — the two endpoints mint different Mongo ids
      // for the same showing, which used to land twice on the week grid.
      const externalId = showtimeId(session) || session._id?.trim();
      const id = externalId
        ? `${SOURCE_ID}:${externalId}`
        : `${SOURCE_ID}:${VENUE_ID}|${title}|${startsAt}`;
      const slot = `${VENUE_ID}|${title}|${startsAt}`;
      const screening: Screening = {
        id,
        sourceId: SOURCE_ID,
        venueId: VENUE_ID,
        title,
        startsAt,
        bookingUrl:
          session.bookingLink?.trim() || `${BASE}/movie/${movie.url ?? ""}`,
        format: formatFromAttrs(session.attributes),
        year,
        runtimeMins,
      };
      const existing = byId.get(id);
      if (existing) {
        mergeScreening(existing, screening);
        continue;
      }
      if (slots.has(slot)) continue;
      byId.set(id, screening);
      slots.add(slot);
    }
  }
}

export const orpheum: SourceAdapter = {
  id: SOURCE_ID,
  kind: "ticketing",
  async fetch() {
    const [playing, soon] = await Promise.all([
      fetchJson<Movie[]>("/api/movie/playing-now"),
      fetchJson<Movie[]>("/api/movie/coming-soon"),
    ]);
    const byId = new Map<string, Screening>();
    const slots = new Set<string>();
    moviesToScreenings(playing, byId, slots);
    moviesToScreenings(soon, byId, slots);
    const screenings = [...byId.values()];
    if (screenings.length === 0) {
      throw new Error("Orpheum returned no screenings");
    }
    return screenings;
  },
};
