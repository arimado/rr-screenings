# Sources

How listings get into the app. Adapters fetch; they emit `Screening` from `domain.md`. The calendar never talks to a cinema site.

## Rules

- **Not on request.** Pages read a store. Ingest is a script (later a GitHub Action on a schedule). It is not a Vercel Cron writing to disk — that disk does not persist.
- **One shared chain.** Cron/script, snapshot write, last-good, and `getScreenings()` exist once. A cinema is only a `fetch()` plugged into the list.
- **One adapter per source**, registered in that list. A new cinema is a new file plus a venue row — not a second ingest pipeline, page, or schema.
- **Isolate failure.** If Ritz is down, write nothing for that source and keep its last-good snapshot. Other sources still publish.
- **Prefer the JSON the booking page already loads** over parsing HTML. HTML is the fallback. Do not scrape Flicks or other aggregators; they are someone else’s database and they will break you.
- **No taste.** Adapters do not set RR pick, “rare”, or “worth a big screen”. Empty `format` is better than a guessed one.
- **Unknown `venueId` is a bug.** Venues are ours. An adapter may not invent a cinema.

```ts
interface SourceAdapter {
  id: string
  kind: "ticketing" | "chain" | "institution" | "manual"
  fetch(): Promise<Screening[]>
}
```

`Screening.id` is `${sourceId}:${externalId}`. If the site has no session id, hash `venueId + title + startsAt`.

The UI imports `getScreenings()`, not adapters. Ingest is the shared script (or Action), never a page load.

## Store

JSON files in git, one per source:

- `data/ritz.json` — `{ fetchedAt, screenings }` after a successful fetch
- `data/ritz.prev.json` — the previous successful file (last-good)

`getScreenings()` reads these files at build/runtime. Ingest runs locally (`npx tsx …`) and, when we care about freshness without a laptop, a GitHub Action that runs the same script and commits. No Postgres, Blob, or KV until git-as-content hurts.

Replace a source’s file only after `fetch()` returns a full list. Never merge a partial scrape into live data. Drop screenings whose `startsAt` is in the past at display time; do not require adapters to filter history unless the payload is huge.

## Kinds

| Kind | What it is | How to fetch |
|---|---|---|
| `ticketing` | Independent with its own booking app (Golden Age / Ferve) | Hit the session endpoint the ticket UI uses |
| `chain` | Dendy, Palace, Ritz | One adapter; map each site to a `venueId` |
| `institution` | MCA, AGNSW, uni societies as film nights | CMS, ICS, or what’s-on HTML — film programmes only |
| `manual` | One-offs, repertory nights, gaps | YAML/JSON we edit. First-class, not a hack |

If it cannot become a `Screening` without lying (a three-month exhibition, a book launch), it does not ship here. Museum **screenings** do.

## Order to add

1. **Ritz** (`ritz` → `ritz-randwick`) — first live source, first ship.
2. **Golden Age** — ticketing JSON, second adapter on the same chain.
3. **Dendy Newtown** (`dendy` → `dendy-newtown`) — Indy GraphQL, one-venue.
4. **Hayden Orpheum** (`orpheum` → `orpheum-cremorne`) — their `/api/movie/playing-now` JSON.
5. **AGNSW** (`agnsw` → `agnsw-domain`) — Sydney Cinémathèque HTML on `/whats-on/cinema/`. Empty weeks are valid.
6. **Palace** (`palace` → `palace-norton-street`, `palace-central-chippendale`, `palace-moore-park`) — one adapter, three venues. Session JSON from each cinema page’s `__NEXT_DATA__`. A venue with no sessions is valid. Not Chauvel (closed January 2026).
7. **MCA** film programmes, then **manual** for festivals and one-nighters.

## How to add a cinema

1. Add the venue in our registry (`id`, `name`, suburb). Stop if we would be inventing a place that is not in `product.md`.
2. New adapter file, `id` kebab-case, `kind` set.
3. `fetch()` returns only `Screening` for known `venueId`s. Titles stay as the cinema wrote them.
4. Register it in the ingest list.
5. Run that adapter alone. Confirm ids are stable across two runs.
6. Point it at its own snapshot path.
7. Do not change the week UI. A new cinema appears because `getScreenings()` has more rows.

## Courtesy

Identify the ingest (user agent / contact) where it is honest to do so. Cache. Do not fetch on every page load or in a tight loop. If a site asks us to stop or offers a feed, use the feed.

## What is not sources

- Film identity, week queries, venue list as product scope — `domain.md` / `product.md`
- Grid, filters, shadcn — `app.md`
