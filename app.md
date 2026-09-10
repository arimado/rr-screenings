# App

What people see. Next.js + shadcn. Reads `getScreenings()`; never imports a source adapter. A new cinema does not add a route.

## Stack

- App Router, TypeScript, Tailwind, shadcn for chrome: filters, badges, sheets, empty states, the film page body.
- The week **grid is ours**. Do not use shadcn’s `Calendar` (that is a date picker). Do not use a scheduling library meant for “my appointments.”

Public, no accounts. Book means an outbound link (`bookingUrl`), marked as leaving the site.

## Read path

```ts
getScreenings(range: { from: Date; to: Date }): Screening[]
```

Pages do not fetch Ritz (or any cinema). `getScreenings()` reads git JSON from `data/`. If the store is empty or a snapshot is stale, show the last-good week and say it is stale — do not spinner-wait on ingest.

Sydney calendar dates only, as in `domain.md`.

## Routes

1. **`/` — Week**  
   Front door. Current week, Monday–Sunday. Prev/next week, not a month jump.

2. **`/film/[slug]` — Film**  
   Title, optional year, remaining sessions grouped by day then venue, book on each time. Slug is the derived film id (`the-odyssey-2026`). The week query (`week`, `venues`, `hide9to5`, `oneLeft`) rides on the film URL so “This week” can return to the same grid.

3. **`/venue/[venueId]` — Venue**  
   Same week grid, that cinema only. No separate layout language.

No map, no search page, no “my list.” Query params on `/` for filters are enough (`venues`) once there is more than one cinema.

## Week grid

Days are columns (on a phone: a vertical stack of days, or swipe; do not shrink seven columns until they are unreadable). On a phone, a Today control jumps to the current Sydney day, or back to this week if you have paged away. Desktop already shows the whole week, so it stays off.

Each day is a stack of **entries**. Default entry is a film at a venue that day:

- Title
- Cinema as a coloured circle (stable per `venueId`; legend in the header)
- Times for that film+venue+day (the two 10:20 / 20:10 screenings collapse here)

Click: the times can go straight to `bookingUrl` if there is one session; otherwise open the film. The cell must not look like a Google Calendar block with duration unless we have `runtimeMins` and even then it is optional — this is a listings grid, not a timetable.

Same film at two cinemas the same day = two entries. Same film two times at one cinema = one entry, two times.

Empty day: leave the column, do not hide the date.

## Filters

On the week, not in a settings page:

- Cinemas (`?venues=id,id`): each cinema is a toggle, including the three Palace sites (Norton St, Central, Moore Park) as their own chips — not one Palace group. Missing `venues` is the default set: every cinema except Palace. Palace is off until you turn a site on. An explicit list keeps those cinemas only. `/venue/[venueId]` is still that cinema on its own.
- Evenings & weekends (`?hide9to5=1`): keeps weekend sessions and weekday sessions from 17:00 Sydney. Drops Mon–Fri 9:00 up to but not including 17:00. When the filter is on, the label includes how many sessions it is showing this week.
- One screening left (`?oneLeft=1`): keeps films whose upcoming listings have exactly one remaining session (title+year, all venues). When the filter is on, the label includes how many sessions it is showing this week.

Filters are toggles. They narrow the grid. They do not change the week.

## Empty and broken

- No rows this week: say so, point at next week if that has rows.
- One source missing: still show the others; small note, not a full-page error.
- Film with no upcoming sessions: don’t 404 if we know the slug from this week; say it’s finished.

## What is not app

- What the product is — `product.md`
- `Screening` shape, film identity, week-as-query — `domain.md`
- Fetch, snapshots, adding a cinema — `sources.md`
