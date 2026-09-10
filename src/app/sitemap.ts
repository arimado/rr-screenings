import {
  loadSnapshots,
  oldestFetchedAt,
  upcomingFilmSlugs,
} from "@/data/get-screenings";
import { filmCanonicalPath } from "@/domain/share";
import { venues } from "@/domain/venue";
import { siteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const fetched = oldestFetchedAt(loadSnapshots());
  const lastModified = fetched ? new Date(fetched) : undefined;
  const loc = (path: string) => new URL(path, origin).href;

  return [
    {
      url: loc("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...venues.map((venue) => ({
      url: loc(`/venue/${venue.id}`),
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...upcomingFilmSlugs().map((slug) => ({
      url: loc(filmCanonicalPath(slug)),
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
