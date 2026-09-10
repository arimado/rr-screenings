import type { ListingsRow } from "@/data/listings-row";
import { isWeekdayNineToFive } from "@/domain/sydney";

export function applyFilters(
  rows: ListingsRow[],
  query: {
    venueIds: string[];
    hide9to5: boolean;
    oneLeftSlugs: Set<string> | null;
  },
): ListingsRow[] {
  if (query.venueIds.length === 0) return [];
  const allowed = new Set(query.venueIds);
  let next = rows.filter((s) => allowed.has(s.venueId));
  if (query.oneLeftSlugs) {
    const slugs = query.oneLeftSlugs;
    next = next.filter((s) => slugs.has(s.slug));
  }
  if (query.hide9to5) {
    next = next.filter((s) => !isWeekdayNineToFive(s.startsAt));
  }
  return next;
}
