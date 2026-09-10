import { filmSlug } from "@/domain/film";
import type { Screening } from "@/domain/screening";
import { isWeekdayNineToFive } from "@/domain/sydney";

export function applyFilters(
  rows: Screening[],
  query: {
    venueIds: string[];
    hide9to5: boolean;
    oneLeftSlugs: Set<string> | null;
  },
): Screening[] {
  let next = rows;
  if (query.venueIds.length > 0) {
    const allowed = new Set(query.venueIds);
    next = next.filter((s) => allowed.has(s.venueId));
  }
  if (query.oneLeftSlugs) {
    const slugs = query.oneLeftSlugs;
    next = next.filter((s) => slugs.has(filmSlug(s.title, s.year)));
  }
  if (query.hide9to5) {
    next = next.filter((s) => !isWeekdayNineToFive(s.startsAt));
  }
  return next;
}
