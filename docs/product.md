# Product

Reading Room’s public filter for **Sydney screenings worth leaving the house for**.

This repo is the cinema-tracker slice of a larger idea (a taste-filtered map of Sydney culture: indie film, literary events, exhibitions, talks). It is not that full discovery app. Film is first because the venues are bounded and the taste is already RR-shaped.

The job is not “what’s on in Sydney”. It is: the parts of Sydney film culture RR people would actually go to.

## In

- A public web app of upcoming screenings, usable without being in Reading Room
- A **week calendar** as the front door: every screening that day, from every included cinema, on one grid
- Sessions still reachable by film and by venue (drill-down from the calendar)
- Outbound links to the cinema’s own booking page

First ship is **Ritz + Golden Age**: week grid + live listings. No RR picks, no derived taste tags.

## Out

- The rest of the discovery app (books, talks, galleries, maps, concierge bot, email digest)
- Accounts, tickets, payments, or becoming a cinema
- RR picks, editorial overlay, “leaving soon” / “rare” as product features (later)
- Scraping aggregators (Flicks et al.) as the database
- Chauvel — closed January 2026; do not treat it as a live source
- Growth/monetisation as a goal. Niche, RR-branded, useful.

## Who it is for

Sydney people who would go to Golden Age, a repertory screening, or a museum film night — including people who are not RR members. Taste-bearing, not insider-only.

## Venues (first)

Ship with a short list. Add more as sources, not as a new product.

**Now**

- Ritz (Randwick)
- Golden Age (Surry Hills)
- Dendy (Newtown)
- Hayden Orpheum (Cremorne)
- AGNSW / Sydney Cinémathèque (Domain Theatre)
- MCA film programmes (The Rocks)
- Palace in Sydney (Moore Park / Norton Street / Central, not Chauvel)

**Next**

- University film societies
- Festivals and one-off repertory nights

## What you see

The product is a calendar of Sydney screenings. You should be able to scan a week and see *what* is on *which day* at *which cinema* without opening a film first.

1. **Week** — the front door. Days across the grid; films stacked in each day, marked by cinema. Default landing is the current week (a Friday visit is “this weekend” plus the days around it). Click a screening to book or to open the film.
2. **Film** — what it is, then every remaining session by day and venue, then book
3. **Venue** — that cinema’s week, same calendar language, one column of sources

Filters sit on the week: cinema, maybe format (35mm, Q&A). With one cinema, the filter can wait. Turning cinemas off is how you read one venue without leaving the calendar, once there is more than one.

Not a personal diary (no “my tickets”, no Google Calendar sync). Not a map. Month view can wait; week is the unit.

## Taste vs listings

Listings come from cinemas. Taste (picks, “rare”, “leaving soon”) is a later overlay. A source adapter must not decide what is good. No editorial in this ship.

## Done enough

Someone in Sydney can open the app, see this week at the Ritz laid out by day, and click through to buy a ticket.
