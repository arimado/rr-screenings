import type { Screening } from "../domain/screening";
import { addDays, sydneyYmd } from "../domain/sydney";
import type { SourceAdapter } from "./types";

const GRAPHQL = "https://newtown.dendy.com.au/graphql";
const SITE_ID = "36";
const VENUE_ID = "dendy-newtown";
const SOURCE_ID = "dendy";
const UA = "rr-movies ingest (public Sydney listings calendar)";
const DAYS = 21;
const SKIP_BADGES = new Set([
  "AD",
  "CC",
  "CCAP",
  "HI",
  "NFT",
  "CAP",
  "OC",
  "RESERVED SEATING",
]);

type Showing = {
  id?: string;
  time?: string;
  movie?: { name?: string; urlSlug?: string; duration?: number };
  showingBadges?: { displayName?: string }[];
};

type ShowingsResponse = {
  data?: { showingsForDate?: { data?: Showing[] } };
  errors?: { message?: string }[];
};

async function graphql(date: string): Promise<Showing[]> {
  const query = `{
    showingsForDate(date: "${date}") {
      data {
        id
        time
        movie { name urlSlug duration }
        showingBadges { displayName }
      }
    }
  }`;
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      "user-agent": UA,
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://newtown.dendy.com.au",
      referer: "https://newtown.dendy.com.au/",
      "client-type": "consumer",
      "site-id": SITE_ID,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Dendy graphql ${date} ${res.status}`);
  }
  const body = (await res.json()) as ShowingsResponse;
  if (body.errors?.length) {
    throw new Error(body.errors[0]?.message || "Dendy graphql error");
  }
  return body.data?.showingsForDate?.data ?? [];
}

function formatFromBadges(badges: { displayName?: string }[] | undefined) {
  const labels = (badges ?? [])
    .map((b) => b.displayName?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name) => !SKIP_BADGES.has(name.toUpperCase()));
  return labels.length ? labels.join(", ") : undefined;
}

function toScreening(row: Showing): Screening | null {
  const title = row.movie?.name?.trim();
  const startsAt = row.time?.trim();
  const externalId = row.id?.trim();
  if (!title || !startsAt || !externalId) return null;
  if (Number.isNaN(Date.parse(startsAt))) return null;
  const slug = row.movie?.urlSlug?.trim();
  const runtime = row.movie?.duration;
  return {
    id: `${SOURCE_ID}:${externalId}`,
    sourceId: SOURCE_ID,
    venueId: VENUE_ID,
    title,
    startsAt,
    bookingUrl: slug
      ? `https://newtown.dendy.com.au/checkout/showing/${slug}/${externalId}`
      : `https://newtown.dendy.com.au/now-showing/`,
    format: formatFromBadges(row.showingBadges),
    runtimeMins: runtime && runtime > 0 ? runtime : undefined,
  };
}

export const dendy: SourceAdapter = {
  id: SOURCE_ID,
  kind: "chain",
  async fetch() {
    const today = sydneyYmd();
    const seen = new Set<string>();
    const screenings: Screening[] = [];

    for (let i = 0; i < DAYS; i++) {
      const date = addDays(today, i);
      for (const row of await graphql(date)) {
        const screening = toScreening(row);
        if (!screening || seen.has(screening.id)) continue;
        seen.add(screening.id);
        screenings.push(screening);
      }
    }

    if (screenings.length === 0) {
      throw new Error("Dendy returned no screenings");
    }
    return screenings;
  },
};
