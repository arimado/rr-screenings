import {
  listingsShareTitle,
  SITE_DESCRIPTION,
  siteTitle,
  venueCanonicalPath,
} from "@/domain/share";
import { getVenue } from "@/domain/venue";
import { currentWeek, resolveListingsWeek } from "@/domain/week";
import type { Metadata } from "next";

export type ListingsSearch = {
  week?: string;
  hide9to5?: string;
  oneLeft?: string;
  venues?: string | string[];
  view?: string;
  day?: string;
};

function listingsDocumentTitle({
  week,
  view,
  day,
  venueName,
}: {
  week: { monday: string; sunday: string };
  view?: "day" | "film";
  day?: string;
  venueName?: string;
}) {
  const when = listingsShareTitle({ week, view, day });
  const isCurrentWeek = week.monday === currentWeek().monday;
  if (view === "day") {
    return venueName
      ? `${venueName} · ${when}`
      : `Sydney cinema ${when}`;
  }
  if (isCurrentWeek) {
    return venueName ? `${venueName} this week` : "Sydney cinema this week";
  }
  return venueName ? `${venueName} · ${when}` : `Sydney cinema ${when}`;
}

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
  const title = siteTitle(
    listingsDocumentTitle({ ...resolved, venueName }),
  );
  const summary = venueName
    ? `Screenings at ${venueName}, ${when}.`
    : resolved.view === "day"
      ? `Screenings on ${when}.`
      : `Screenings ${when}.`;
  const description = `${summary} ${SITE_DESCRIPTION}`;
  const canonical = venueId ? venueCanonicalPath(venueId) : "/";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary", title, description },
  };
}
