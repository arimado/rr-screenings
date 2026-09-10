# Domain

The language everything else uses. Sources emit this shape. The calendar is a view over it. Change this rarely.

## Four things

**Screening** — one showing: this film, this venue, this start time. The only fact in the system. The week grid is a pile of screenings, not a separate object.

**Film** — a grouping of screenings that are the same movie. Not scraped as its own record. Derived from title + year until that collides.

**Venue** — a place you go. Golden Age Surry Hills, Dendy Newtown, Palace Moore Park.

**Source** — how we found out. Golden Age’s ticket feed, Palace’s chain site, a YAML file of one-offs.

Venue and source are different. Palace is one source and several venues. A festival is a source that may use a borrowed venue. A venue can later have more than one source (Palace’s site plus a manual Q&A). Do not collapse them.

## Screening

Every adapter emits this. Nothing downstream should need HTML.

```ts
type Screening = {
  id: string              // `${sourceId}:${externalId}`
  sourceId: string        // "golden-age"
  venueId: string         // "golden-age-surry-hills"
  title: string
  startsAt: string        // ISO 8601, instant; display in Australia/Sydney
  bookingUrl?: string
  format?: string         // 35mm, Q&A, preview
  year?: number
  runtimeMins?: number
}
```

- `id` is stable for that showing at that source. If Golden Age reuse a session id, we reuse it. If they don’t give one, hash `venueId + title + startsAt`.
- `startsAt` is stored as an instant (UTC in the ISO string). All calendar days are **Sydney calendar dates**, not UTC dates. A 12:30am Thursday screening is Thursday in Sydney.
- `title` is the cinema’s title, not a cleaned canonical name. Film identity (below) is where we normalize.
- `format` is a label from the source, optional. Empty is fine.
- No price, no seats left, no “is this good”. Those are either another system or editorial.

## Film identity

Two screenings are the same film when they match on **normalized title + year**.

Normalize: trim, lowercase, collapse whitespace, drop a trailing year in parentheses if `year` is already set. Do not fuzzy-match, do not use TMDB, until two different movies share a title in the same year.

A film has no id of its own yet. If we need a slug, it is derived (`the-odyssey-2026`). Editorial keys off that same slug.

When title+year is wrong (a season vs a film, a double bill), fix it in editorial or a local alias table — not by making adapters smarter.

## Venue

```ts
type Venue = {
  id: string              // "dendy-newtown"
  name: string            // "Dendy Newtown"
  suburb?: string
}
```

Venues are ours. We list them; sources only point at `venueId`. Unknown `venueId` from an adapter is a bug, not a new cinema.

Closed places (Chauvel) stay out of the live list. History can wait.

## Source

```ts
type Source = {
  id: string              // "palace"
  kind: "ticketing" | "chain" | "institution" | "manual"
}
```

A source produces screenings. It does not produce films, weeks, or picks. How it fetches is `sources.md`.

Museum and festival **film nights** are still screenings (MCA, AGNSW, SFF as a source). A book launch or a three-month exhibition is not. If a source cannot emit this type without lying, it does not belong here yet.

## Week is a query

A week is Saturday–Friday or Monday–Sunday — pick one in the app and keep it. Domain only cares that:

- A week is `screenings` whose **Sydney date** falls in that range.
- The same film can appear on several days, at several venues, several times in one day.
- The calendar cell is a **screening** (or a stack of screenings for the same film+venue+day). It is not “the film that day” as a single unique row — *The Odyssey* at Dendy 10:20 and 20:10 on Friday are two screenings. The UI may collapse them; the data must not.

“Leaving soon” is derived: last remaining `startsAt` for that film is within N days. Not a field on `Screening`.

## Cinema-shaped, on purpose

Venue, source, Sydney dates, and “adapter emits a canonical row” will transfer to other RR culture products. `Screening` and film identity (title + year) will not.

Do not rename this to `Event` or add `kind: talk | exhibition` until a real source cannot fit `Screening`. Then the atom becomes a tagged occurrence with optional `endsAt`; screening fields stay on `kind === "screening"`. Work (one film, many sessions) is a later split, when identity or RR picks need it.

Other kinds do not land on the week grid by default. Same plumbing, different view — not a fatter screening.

## What is not domain

- RR picks, “worth a big screen”, copy, posters — editorial, keyed by film slug.
- Adapter internals, HTML, cron, last-good snapshots — sources.
- Grid layout, filters, shadcn — app.
- Tickets, users, “my calendar”.
- Talks, launches, exhibitions as first-class types.
