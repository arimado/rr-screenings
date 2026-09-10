import { filmSlug } from "@/domain/film";
import type { Screening } from "@/domain/screening";
import { formatSydneyTime, instantToSydneyYmd } from "@/domain/sydney";

/** Slim screening for the listings UI — drops ingest-only fields. */
export type ListingsRow = {
  id: string;
  venueId: string;
  title: string;
  year?: number;
  slug: string;
  startsAt: string;
  bookingUrl?: string;
  day: string;
  label: string;
};

export function toListingsRows(screenings: Screening[]): ListingsRow[] {
  return screenings.map((s) => ({
    id: s.id,
    venueId: s.venueId,
    title: s.title,
    ...(s.year != null ? { year: s.year } : {}),
    slug: filmSlug(s.title, s.year),
    startsAt: s.startsAt,
    ...(s.bookingUrl ? { bookingUrl: s.bookingUrl } : {}),
    day: instantToSydneyYmd(s.startsAt),
    label: formatSydneyTime(s.startsAt),
  }));
}
