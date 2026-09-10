# rr-movies

Reading Room week calendar of Sydney screenings.

Specs and how it was built live in [`docs/`](docs/):

- [product.md](docs/product.md) — what this is for
- [domain.md](docs/domain.md) — Screening, film, venue, source
- [sources.md](docs/sources.md) — ingest and adapters
- [app.md](docs/app.md) — routes, grid, filters
- [how-it-was-built.md](docs/how-it-was-built.md) — how the repo implements those
- [technical.md](docs/technical.md) — the same system, explained for someone new to the repo

```bash
npm install
npm run dev
```

Refresh listings (writes `data/{source}.json`):

```bash
npm run ingest
```
