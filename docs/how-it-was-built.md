# How this was built

Reading Room needed a public week of Sydney screenings, not a cinema, not a diary, not “what’s on.” The four specs in this folder are the brief. This note is how the repo actually implements them. For a junior-friendly walkthrough of the same system, see [technical.md](technical.md).

## Specs first

The code follows four documents, not the other way around:

| Doc | Job |
|---|---|
| [product.md](product.md) | Who it is for, which cinemas, what is in and out |
| [domain.md](domain.md) | `Screening` as the only fact; film, venue, source stay separate |
| [sources.md](sources.md) | Fetch off the request path; one adapter per cinema; git JSON as the store |
| [app.md](app.md) | Week as the front door; pages read `getScreenings()`; a new cinema does not add a route |

Change product rarely, domain almost never, sources when adding a cinema, app when the grid or URLs change.

## The pipeline

Cinema sites never talk to a page. Ingest talks to cinema sites. Pages talk to files.

```
cinema sites
    → src/sources/*   (one adapter, emit Screening[])
    → src/ingest/run.ts
    → data/{source}.json  (+ .prev.json last-good)
    → getScreenings()
    → /  /film/[slug]  /venue/[venueId]
    → cinema bookingUrl (outbound)
```

`npm run ingest` walks the adapter list, times out each fetch, and writes a snapshot only on a full success. A failed source keeps its previous file. That is how Ritz being down does not blank Golden Age.

There is no database. The listings *are* the JSON in git. When a laptop should not be the freshness story, the same script can run in CI and commit.

## Where the code sits

```
src/domain/     Screening, venue registry, Sydney dates, week-as-query, film slug
src/sources/    adapters only — fetch() → Screening[]
src/ingest/     the one write path
src/data/       read snapshots, filter, group film+venue+day (and film-for-the-week)
src/app/        three routes
src/components/ week grid, day/week/film chrome, share
```

The UI must not import an adapter. A cinema is a new file in `sources/`, a venue row, and a line in the ingest list. The week grid does not know the cinema exists until rows show up.

## Decisions that stuck

**Week is a query, not an object.** Monday–Sunday in Sydney. The grid is a pile of screenings whose calendar date falls in that range. Same film, two times, one cinema, one day → one cell, two times. Same film, two cinemas → two cells.

**Dates are Sydney, instants are UTC.** `startsAt` is stored as an ISO instant. Display and “what day is this” always use `Australia/Sydney`. A 12:30am Thursday session is Thursday.

**Filters live on the URL and run on the client.** Cinema chips, evenings & weekends, one-screening-left. They `replace` the query so the address bar is the permalink. Share copies that URL. Film share is the exception: `/film/[slug]` only; the week query on a film link is just so Back can return.

**Day view is still the same page.** `?day=YYYY-MM-DD` is enough. Film grouping is also the same page: `?week=&view=film`. No extra route, no month view.

**Book means leave.** One remaining session on a cell goes straight to the cinema. Several sessions go to the film page, then out. This app does not sell tickets.

**shadcn for chrome, not the calendar.** Toggles, badges, tooltips. The week grid is ours. shadcn’s Calendar is a date picker; a scheduling library is “my appointments.” Neither is a listings grid.

## How it grew

1. **Ritz only** — prove the chain: adapter → snapshot → week grid → book.
2. **Golden Age, then Dendy, Orpheum, AGNSW, Palace, MCA** — same ingest, more adapters. Palace is one source and three venues. Palace sites stay off until you turn a chip on. MCA is an institution feed, like AGNSW; empty weeks are valid.
3. **Client filters** — chips used to wait on the server; they now update the grid immediately and keep the query in the bar.
4. **Day view** — the week is still the unit; a single Sydney date is easier to send a mate.
5. **Share** — the bar was already the permalink; a control and human titles (`Film in Syd`) make that obvious.
6. **Film grouping** — same week, titles first, then where/when. `/film/[slug]` stays the drill-down.

## What we did not build

Accounts, tickets, maps, search, “my list,” Google Calendar, RR picks, taste tags, scraping Flicks. Chauvel is closed; it is not a source. Those stay out until a spec says otherwise.
