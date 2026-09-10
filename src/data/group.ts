import type { ListingsRow } from "@/data/listings-row";
import { getVenue } from "@/domain/venue";

export type DayEntry = {
  key: string;
  slug: string;
  title: string;
  year?: number;
  venueId: string;
  venueName: string;
  times: { id: string; startsAt: string; label: string; bookingUrl?: string }[];
};

export type FilmWeekTime = {
  id: string;
  startsAt: string;
  day: string;
  label: string;
  bookingUrl?: string;
};

export type FilmWeekVenue = {
  venueId: string;
  venueName: string;
  times: FilmWeekTime[];
};

export type FilmWeekEntry = {
  slug: string;
  title: string;
  year?: number;
  venues: FilmWeekVenue[];
};

export function groupFilmEntries(rows: ListingsRow[]): FilmWeekEntry[] {
  const films = new Map<
    string,
    {
      slug: string;
      title: string;
      year?: number;
      venues: Map<string, FilmWeekVenue>;
    }
  >();

  for (const s of rows) {
    let film = films.get(s.slug);
    if (!film) {
      film = { slug: s.slug, title: s.title, year: s.year, venues: new Map() };
      films.set(s.slug, film);
    }
    let venue = film.venues.get(s.venueId);
    if (!venue) {
      venue = {
        venueId: s.venueId,
        venueName: getVenue(s.venueId)?.name ?? s.venueId,
        times: [],
      };
      film.venues.set(s.venueId, venue);
    }
    venue.times.push({
      id: s.id,
      startsAt: s.startsAt,
      day: s.day,
      label: s.label,
      bookingUrl: s.bookingUrl,
    });
  }

  const list: FilmWeekEntry[] = [...films.values()].map((f) => {
    const venues = [...f.venues.values()].map((v) => ({
      ...v,
      times: v.times.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
    venues.sort((a, b) => a.times[0].startsAt.localeCompare(b.times[0].startsAt));
    return { slug: f.slug, title: f.title, year: f.year, venues };
  });
  list.sort((a, b) =>
    a.venues[0].times[0].startsAt.localeCompare(b.venues[0].times[0].startsAt),
  );
  return list;
}

export function groupDayEntries(rows: ListingsRow[]): Map<string, DayEntry[]> {
  const byDay = new Map<string, Map<string, DayEntry>>();

  for (const s of rows) {
    const groupKey = `${s.slug}|${s.venueId}`;
    if (!byDay.has(s.day)) byDay.set(s.day, new Map());
    const dayMap = byDay.get(s.day)!;
    let entry = dayMap.get(groupKey);
    if (!entry) {
      entry = {
        key: groupKey,
        slug: s.slug,
        title: s.title,
        year: s.year,
        venueId: s.venueId,
        venueName: getVenue(s.venueId)?.name ?? s.venueId,
        times: [],
      };
      dayMap.set(groupKey, entry);
    }
    entry.times.push({
      id: s.id,
      startsAt: s.startsAt,
      label: s.label,
      bookingUrl: s.bookingUrl,
    });
  }

  const result = new Map<string, DayEntry[]>();
  for (const [day, entries] of byDay) {
    const list = [...entries.values()].map((e) => ({
      ...e,
      times: e.times.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
    list.sort((a, b) => a.times[0].startsAt.localeCompare(b.times[0].startsAt));
    result.set(day, list);
  }
  return result;
}
