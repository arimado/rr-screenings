import { filmSlug } from "@/domain/film";
import type { Screening } from "@/domain/screening";
import { formatSydneyTime, instantToSydneyYmd } from "@/domain/sydney";
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

export function groupDayEntries(screenings: Screening[]): Map<string, DayEntry[]> {
  const byDay = new Map<string, Map<string, DayEntry>>();

  for (const s of screenings) {
    const day = instantToSydneyYmd(s.startsAt);
    const slug = filmSlug(s.title, s.year);
    const groupKey = `${slug}|${s.venueId}`;
    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;
    let entry = dayMap.get(groupKey);
    if (!entry) {
      entry = {
        key: groupKey,
        slug,
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
      label: formatSydneyTime(s.startsAt),
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
