import { formatSydneyDayHeading, formatSydneyWeekRange } from "./sydney";
import type { Week } from "./week";

export const SITE_NAME = "Film in Syd";

export const SITE_DESCRIPTION =
  "This week at the Ritz, Golden Age, Dendy, the Orpheum, AGNSW, Palace Norton St, Palace Central, and Palace Moore Park.";

export function siteTitle(label?: string) {
  return label ? `${label} · ${SITE_NAME}` : SITE_NAME;
}

export function listingsShareTitle({
  week,
  view,
  day,
  venueName,
}: {
  week: Week;
  view?: "day" | "film";
  day?: string;
  venueName?: string;
}) {
  const when =
    view === "day" && day
      ? formatSydneyDayHeading(day)
      : formatSydneyWeekRange(week.monday, week.sunday);
  return venueName ? `${venueName} · ${when}` : when;
}

export function filmShareTitle(title: string, year?: number) {
  return year != null ? `${title} (${year})` : title;
}

export function filmCanonicalPath(slug: string) {
  return `/film/${slug}`;
}
