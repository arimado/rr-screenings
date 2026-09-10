import type { Screening } from "../domain/screening";
import { sydneyLocalToIso } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const BROWSE_URL = "https://tix.ourgoldenage.com.au/api/v1/Items/Browse";
const TIX_BASE = "https://tix.ourgoldenage.com.au";
const VENUE_ID = "golden-age-surry-hills";
const SOURCE_ID = "golden-age";
const UA = "rr-movies ingest (public Sydney listings calendar)";

type BrowseItem = {
  Hash?: string;
  Name?: string;
  DateTime?: string;
  Runtime?: number;
  URL?: string;
  AttributeString?: string;
};

type BrowseResponse = {
  Items?: BrowseItem[];
};

function localDateTimeToIso(value: string): string | null {
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return sydneyLocalToIso(m[1], Number(m[2]), Number(m[3]));
}

export const goldenAge: SourceAdapter = {
  id: SOURCE_ID,
  kind: "ticketing",
  async fetch() {
    const res = await fetch(BROWSE_URL, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`Golden Age browse ${res.status}`);
    }
    const body = (await res.json()) as BrowseResponse;
    const items = body.Items ?? [];
    const screenings: Screening[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const title = item.Name?.trim();
      const startsAt = item.DateTime ? localDateTimeToIso(item.DateTime) : null;
      if (!title || !startsAt) continue;
      const externalId = item.Hash?.trim();
      const id = externalId
        ? `${SOURCE_ID}:${externalId}`
        : `${SOURCE_ID}:${VENUE_ID}|${title}|${startsAt}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const path = item.URL?.trim();
      const format = item.AttributeString?.trim();
      screenings.push({
        id,
        sourceId: SOURCE_ID,
        venueId: VENUE_ID,
        title,
        startsAt,
        bookingUrl: path
          ? path.startsWith("http")
            ? path
            : `${TIX_BASE}${path}`
          : `${TIX_BASE}/Events`,
        format: format || undefined,
        runtimeMins: item.Runtime || undefined,
      });
    }

    if (screenings.length === 0) {
      throw new Error("Golden Age returned no screenings");
    }
    return screenings;
  },
};
