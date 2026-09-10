import {
  listingsShareTitle,
  SITE_DESCRIPTION,
  siteTitle,
} from "@/domain/share";
import { getVenue } from "@/domain/venue";
import { resolveListingsWeek } from "@/domain/week";
import type { Metadata } from "next";

export type ListingsSearch = {
  week?: string;
  hide9to5?: string;
  oneLeft?: string;
  venues?: string | string[];
  view?: string;
  day?: string;
};

export function listingsMetadata({
  week,
  view,
  day,
  venueId,
}: {
  week?: string;
  view?: string;
  day?: string;
  venueId?: string;
}): Metadata {
  const resolved = resolveListingsWeek({
    weekParam: week,
    view,
    dayParam: day,
  });
  const venueName = venueId ? getVenue(venueId)?.name : undefined;
  const when = listingsShareTitle(resolved);
  const label = listingsShareTitle({ ...resolved, venueName });
  const title = siteTitle(label);
  const description = venueName
    ? `Screenings at ${venueName}, ${when}.`
    : resolved.view === "day"
      ? `Screenings on ${when}.`
      : `Screenings ${when}.`;
  return {
    title: { absolute: title },
    description: `${description} ${SITE_DESCRIPTION}`,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}
