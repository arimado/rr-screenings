# How this app works (technical)

This is a walkthrough of the codebase for someone who can write TypeScript/React but has not seen this repo before. The short version is [how-it-was-built.md](how-it-was-built.md). The product rules are in [product.md](product.md), [domain.md](domain.md), [sources.md](sources.md), and [app.md](app.md).

## What it is

**Film in Syd** is a public calendar of upcoming cinema screenings in Sydney. You open the site, scan this week (or one day), and click through to the cinema’s own booking page.

It is not a ticket shop, not a logged-in diary, and not a search engine. There are no accounts. “Book” always means **leave this site**.

## The one idea that unlocks the rest

The only fact in the system is a **screening**: this film, at this cinema, starting at this instant.

Everything else is derived:

| Word | What it actually is |
|---|---|
| **Screening** | One showing. Stored in JSON. The only thing adapters produce. |
| **Film** | “These screenings are the same movie.” Not a database row. We group by normalised title + year and give it a slug like `the-odyssey-2026`. |
| **Venue** | A place people go. We own the list (`src/domain/venue.ts`). Adapters may only point at an id we already have. |
| **Source** | How we found out. Golden Age’s ticket feed is one source. Palace’s website is one source that covers three venues. |
| **Week** | Not an object we store. A query: “screenings whose **Sydney calendar date** falls Mon–Sun.” |
| **Day entry** | UI grouping: same film + same venue + same day, with one or more times. |

Venue ≠ source. Palace is **one source, three venues**. If you collapse those, you cannot turn Norton St on and Moore Park off.

## Folder map

```
data/                 JSON snapshots ingest writes (this is the “database”)
src/domain/           types and rules: Screening, venues, Sydney dates, week query, film slug
src/sources/          one file per cinema website; fetch() → Screening[]
src/ingest/run.ts     the only code that writes data/
src/data/             read snapshots, drop past sessions, filter, group into grid cells
src/app/              three routes: /  /film/[slug]  /venue/[venueId]
src/components/       week grid, film list, filters, share
```

A rule you will break if you are not careful: **UI code must not import a source adapter.** Pages call `getScreenings()` (and friends). They never `fetch()` a cinema site. If Ritz’s HTML changes, only `src/sources/ritz.ts` should care.

## A screening, in real life

From `data/ritz.json`:

```json
{
  "id": "ritz:90823",
  "sourceId": "ritz",
  "venueId": "ritz-randwick",
  "title": "Practical Magic 2",
  "startsAt": "2026-09-10T10:50:00.000Z",
  "bookingUrl": "https://www.ritzcinemas.com.au/tickets?c=0000000004&s=90823",
  "format": "NFT"
}
```

- `id` is `sourceId` + the cinema’s session id. If the site has no id, we hash `venueId + title + startsAt`. It must be stable across ingest runs so we can tell “this showing” from “a new one.”
- `startsAt` is an **instant** (UTC in the ISO string). We never store “Thursday 8:50pm” as a string. Display always converts to Australia/Sydney.
- `title` is whatever the cinema wrote. We do not tidy it into a canonical movie name here.
- There is no price, no seats left, no “is this good.” Those are another system or editorial, later.

A snapshot file is `{ fetchedAt, screenings }`. One file per source: `data/ritz.json`, `data/golden-age.json`, and so on.

## Timezones (the bug you will hit)

Sydney is not UTC. `2026-09-10T10:50:00.000Z` is 8:50pm on 10 Sep in Sydney (UTC+10). If you take `.getDate()` on that `Date` in a UTC server, you might land on the 10th still; a 1:30am Thursday screening in Sydney is still Wednesday in UTC.

So:

- **Storage:** ISO instant.
- **“What day is this?”:** `instantToSydneyYmd()` in `src/domain/sydney.ts`.
- **“What time do we print?”:** `formatSydneyTime()`.
- **“What is today?”:** `sydneyYmd()` — today’s date in Sydney, not in the server’s TZ.

The week is Monday–Sunday in Sydney. `src/domain/week.ts` builds that as seven `YYYY-MM-DD` strings.

## How listings get into the app

Pages do **not** scrape cinemas. If they did, every visitor would hammer cinema sites, and a slow Ritz would stall the homepage.

Instead there is a **write path** (ingest) and a **read path** (the Next.js app).

### Write path: `npm run ingest`

1. `src/ingest/run.ts` imports `sources` from `src/sources/index.ts` (the list of adapters).
2. For each adapter it calls `fetch()`, with a 60s timeout.
3. If the result is a proper array, it copies the current `data/{id}.json` to `data/{id}.prev.json` (last-good), then overwrites the current file.
4. If fetch throws or times out, it **writes nothing** for that source. Yesterday’s file stays. Other sources still update.

That is why a down cinema does not blank the whole grid.

An adapter is only this:

```ts
type SourceAdapter = {
  id: string;           // "ritz"
  kind: "ticketing" | "chain" | "institution" | "manual";
  fetch: () => Promise<Screening[]>;
};
```

Inside `fetch()`, each cinema is different: JSON the booking UI already loads, GraphQL, `__NEXT_DATA__` on a Palace page, HTML + cheerio for Ritz or AGNSW. The **output shape is the same**. Downstream never sees HTML.

Adapters must not invent a `venueId`. If Palace returns a site we do not list, that is a bug in the adapter, not a new cinema.

### Read path: `getScreenings()`

`src/data/get-screenings.ts` reads every `data/*.json` (and `.prev.json` if the live file is missing). It:

- drops sessions whose `startsAt` is already in the past
- can slice to a set of Sydney dates (`getScreeningsForDays`)
- can find all remaining sessions for a film slug (`getUpcomingBySlug`)

If a snapshot is older than 24 hours, the UI still shows it and marks it stale. We do not spinner-wait for ingest on a page load — ingest is not running then.

There is no Postgres. The listings **are** the JSON in git. Refresh means run ingest (locally, or later a GitHub Action that commits).

## What happens when someone opens `/`

Next.js App Router: a URL maps to a file under `src/app/`.

```
GET /?day=2026-09-12&hide9to5=1
        │
        ▼
src/app/page.tsx          (Server Component)
  reads searchParams
  generateMetadata()      → tab title / chat unfurl
  <WeekView ... />
        │
        ▼
src/components/week-view.tsx   (still server)
  resolveListingsWeek()   → which Mon–Sun, day vs week vs film
  getScreeningsForDays()  → rows for this week (and next, for empty-state links)
  parseVenueIds()         → which cinema chips are on
        │
        ▼
src/components/week-view-client.tsx   ("use client")
  applyFilters()          → chips / evenings / one-left
  groupDayEntries()       → week/day cells
  groupFilmEntries()      → film cards when view=film
  WeekGrid / FilmWeekList / WeekNav / ShareButton
```

`export const dynamic = "force-dynamic"` on the pages means we do not statically bake “this week” at build time. “Today” is Sydney today when the request runs.

### Server vs client (why two week files)

**Server Components** can read the filesystem (`data/`). They cannot use `useState` or click handlers.

**Client Components** (`"use client"`) can toggle chips and call `router.replace`. They cannot `readFileSync` themselves; the server passes screenings in as props.

So `week-view.tsx` loads data. `week-view-client.tsx` owns the interactive grid. When you tap a cinema chip, we do **not** refetch Ritz. We filter the array we already have and update the URL.

## From screenings to grid cells

The data layer must not collapse two screenings into one. The **UI** may.

`groupDayEntries()` in `src/data/group.ts`:

- Puts each screening on its Sydney date.
- Groups by `filmSlug + venueId`.
- Sorts times.

So:

- *The Odyssey* at Dendy 10:20 and 20:10 Friday → **one cell**, two times.
- *The Odyssey* at Dendy and at Golden Age the same day → **two cells**.

`groupFilmEntries()` groups the same week by slug, then venue, then time. The UI prints compact weekday+time on each cinema line. Two Friday times at one cinema stay two screenings in the data; they share a line in the card.

Click behaviour (`WeekGrid` → `EntryCard`, and `FilmWeekList` → `FilmCard`):

- **One time** with a `bookingUrl` → `<a target="_blank">` to the cinema.
- **Several times** → `/film/{slug}?…` so you can pick a session.

## URLs are the permalink

Filters and view are query params, not React-only state. `weekSearchParams()` / `weekHref()` in `src/components/week-grid.tsx` build them.

| You are looking at | URL |
|---|---|
| Current week, default cinemas | `/` (after paging: `/?week=2026-09-08`) |
| Saturday | `/?day=2026-09-12` |
| This week, grouped by film | `/?week=2026-09-08&view=film` |
| Evenings only | `/?week=…&hide9to5=1` |
| Just Golden Age | `/?venues=golden-age-surry-hills` |
| No cinemas | `/?venues=none` |

Rules worth memorising:

- A valid `day=` **is** day view. We omit `week` and `view` from new links. Old `?view=day&week=&day=` still works (`resolveListingsWeek`). Day wins over `view=film`.
- Film grouping is `view=film` next to `week=`. It never writes `day`.
- Missing `venues` means the **default set**: every cinema except Palace. Palace chips are off until you turn one on. That is `defaultOn: false` on those venue rows.
- `hide9to5=1` keeps weekends and weekday sessions from 17:00 Sydney. It drops Mon–Fri from 9:00 up to (not including) 17:00.
- `oneLeft=1` keeps films that have exactly one remaining session **anywhere**, not just this week.

Toggles call `router.replace` (not `push`) so the back button is not a graveyard of chip clicks. The address bar always matches the grid, which is why Share can copy `window.location.href`.

`/venue/golden-age-surry-hills` is the same `WeekView` with that cinema forced on. It is not a different layout.

## Film page

`/film/the-taste-of-tea` lists remaining sessions by day, then venue, then time. Each time with a `bookingUrl` is outbound.

In-app links from the grid **keep** the week/day/`view=film`/filter query so “Back / This week” can return to the same listings. **Share** on the film page sends `/film/{slug}` only — a mate should not inherit your “evenings & weekends” filter.

If the film has no upcoming sessions but we still know the slug from stored listings, we do not 404; we say it has finished.

## Share and titles

`ShareButton` (`src/components/share-button.tsx`):

1. If the browser has `navigator.share` (phones), open the system sheet with a title + url.
2. Otherwise copy the url and show “Copied.”
3. If the user cancels the sheet (`AbortError`), do not copy.

Listings share the current URL (filters included). Film share is the canonical path.

`generateMetadata` on `/`, `/venue/…`, and `/film/…` sets the tab title and Open Graph/Twitter text (`Film in Syd`, not `rr-movies`). Titles use the same helpers as Share (`src/domain/share.ts`) so they do not drift. There is no custom OG image yet.

## Stack

- **Next.js App Router** (v16) + React 19. Routes are folders under `src/app/`.
- **TypeScript** everywhere.
- **Tailwind** + **shadcn** for chips, badges, tooltips, buttons. We did **not** use shadcn’s Calendar (that is a date picker) or a scheduling library (that is “my appointments”). The week grid is custom.
- **cheerio** only inside HTML adapters.
- **tsx** to run ingest with TypeScript (`npm run ingest`).

Local loop:

```bash
npm install
npm run ingest    # optional; data/ may already be committed
npm run dev       # http://localhost:3000
```

## How to add a cinema (checklist)

Follow [sources.md](sources.md). In code terms:

1. Add a venue in `src/domain/venue.ts` (`id`, `name`, suburb, colour). Stop if the place is not in [product.md](product.md).
2. New `src/sources/{name}.ts` that returns `Screening[]` for known `venueId`s.
3. Append it to `src/sources/index.ts`.
4. Run ingest; confirm ids are stable on a second run.
5. Do not add a route or change the grid. The cinema appears because there are more rows.

## Common gotchas

**“I fetched in a Server Component and the cinema blocked us.”** Don’t. Ingest is the only writer.

**“I used `new Date(startsAt)` and grouped by UTC date.”** Use `instantToSydneyYmd`.

**“I added a cinema and nothing showed up.”** Check `venueId` matches the registry, ingest wrote `data/{id}.json`, and Palace-style `defaultOn: false` is not hiding it.

**“Share sent a huge film URL.”** In-app film links carry query for Back. Share must use `filmCanonicalPath(slug)`.

**“I used shadcn Calendar for the week.”** Wrong component. Build on `WeekGrid`.

**“I want to merge a half-finished scrape into `data/ritz.json`.”** Don’t. Replace the file only after a full successful `fetch()`. Last-good is the `.prev.json` copy.

## Where to go next

| If you are… | Read |
|---|---|
| Changing who it’s for / which cinemas | [product.md](product.md) |
| Changing `Screening` or film identity | [domain.md](domain.md) |
| Adding or fixing a scrape | [sources.md](sources.md) + `src/sources/` |
| Changing the grid, filters, or URLs | [app.md](app.md) + `src/components/week-*.tsx` |
| Wanting the one-page architecture | [how-it-was-built.md](how-it-was-built.md) |
