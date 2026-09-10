import { isDefaultVenueIds } from "@/domain/venue";

export type WeekQuery = {
  venueIds?: string[];
  hide9to5?: boolean;
  oneLeft?: boolean;
  view?: "day" | "film" | "month";
  day?: string;
  month?: string;
};

export function weekSearchParams(monday: string, q: WeekQuery = {}) {
  const params = new URLSearchParams();
  if (q.view === "day" && q.day) {
    params.set("day", q.day);
  } else if (q.view === "month") {
    params.set("view", "month");
    if (q.month) params.set("month", q.month);
  } else {
    params.set("week", monday);
    if (q.view === "day") params.set("view", "day");
    if (q.view === "film") params.set("view", "film");
  }
  if (q.venueIds && !isDefaultVenueIds(q.venueIds)) {
    params.set("venues", q.venueIds.length > 0 ? q.venueIds.join(",") : "none");
  }
  if (q.hide9to5) params.set("hide9to5", "1");
  if (q.oneLeft) params.set("oneLeft", "1");
  return params;
}

export function weekHref(monday: string, q: WeekQuery = {}) {
  return `/?${weekSearchParams(monday, q).toString()}`;
}

export function filmHref(slug: string, monday: string, q: WeekQuery = {}) {
  return `/film/${slug}?${weekSearchParams(monday, q).toString()}`;
}
