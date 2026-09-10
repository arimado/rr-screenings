import type { Screening } from "@/domain/screening";
import { filmCanonicalPath } from "@/domain/share";
import { getVenue } from "@/domain/venue";
import { siteUrl } from "@/lib/site-url";

export function filmJsonLd({
  slug,
  title,
  year,
  screenings,
}: {
  slug: string;
  title: string;
  year?: number;
  screenings: Screening[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: title,
    ...(year != null ? { datePublished: String(year) } : {}),
    url: new URL(filmCanonicalPath(slug), siteUrl()).href,
    event: screenings.map((s) => {
      const venue = getVenue(s.venueId);
      return {
        "@type": "ScreeningEvent",
        startDate: s.startsAt,
        ...(s.bookingUrl ? { url: s.bookingUrl } : {}),
        location: {
          "@type": "MovieTheater",
          name: venue?.name ?? s.venueId,
          ...(venue?.suburb
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: venue.suburb,
                  addressRegion: "NSW",
                  addressCountry: "AU",
                },
              }
            : {}),
        },
      };
    }),
  };
}
