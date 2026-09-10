import {
  formatSydneyDayHeading,
  formatSydneyMonth,
  formatSydneyWeekRange,
  sydneyYmd,
} from "./sydney";
import type { Week } from "./week";

export const SITE_NAME = "Film In Syd";

export const SITE_DESCRIPTION =
  "Full weekly schedule of screenings happening at good cinemas.";

export function siteTitle(label?: string) {
  return label ? `${label} · ${SITE_NAME}` : SITE_NAME;
}

export function listingsShareTitle({
  week,
  view,
  day,
  month,
  venueName,
}: {
  week: Week;
  view?: "day" | "film" | "month";
  day?: string;
  month?: string;
  venueName?: string;
}) {
  const when =
    view === "day" && day
      ? formatSydneyDayHeading(day)
      : view === "month" && month
        ? month === sydneyYmd().slice(0, 7)
          ? "This month"
          : formatSydneyMonth(month)
        : formatSydneyWeekRange(week.monday, week.sunday);
  return venueName ? `${venueName} · ${when}` : when;
}

export function filmShareTitle(title: string, year?: number) {
  return year != null ? `${title} (${year})` : title;
}

export function filmCanonicalPath(slug: string) {
  return `/film/${slug}`;
}

export function venueCanonicalPath(venueId: string) {
  return `/venue/${venueId}`;
}
