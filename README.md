# Ashland Daily Help

A community resource hub for Ashland and Jackson County, Oregon: food, showers, shelter and someone who knows the way.

This repo holds two things:

- **The new app** (repo root): a full-stack TypeScript app on Cloudflare Workers, with React rendered on the server and Postgres. It reads curated data from the steward and serves it to the public. Its user stories are in [`user-stories/`](user-stories/).
- **The static site** ([`legacy/`](legacy/)): the original installable, offline-capable site built at Rogue Raise. It stays live until the new app replaces it.

## Origin

Built at [Rogue Raise: The Unhoused](https://whiterabbitashland.com/rogue-raise) (October 23–25, 2026), White Rabbit's weekend community build in Ashland. Event notes, team links, hotlines and a dated snapshot of the local resource directory live in the sibling repo [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise), under [`2026-10-unhoused/`](https://github.com/RVAILab/RogueRaise/tree/main/2026-10-unhoused). Locally it is usually checked out next to this repo at `../RogueRaise`.

## Backend

Collecting, organizing and resolving resources and events is the job of a separate app, [RVAILab/daily-help-steward](https://github.com/RVAILab/daily-help-steward). It harvests what providers already publish, routes changes through human review, and publishes a feed (contract: the steward's [`docs/FEED.md`](https://github.com/RVAILab/daily-help-steward/blob/main/docs/FEED.md)). This app only reads that feed.

## The new app

React Router 8 (framework mode) on a Cloudflare Worker, Drizzle ORM over Postgres, Vitest, Playwright and Biome.

### Running locally

You need Node 24 and Postgres 15 or newer.

```sh
npm install
npm run db:start      # a private Postgres cluster in .postgres/ on port 5433 (needs the postgres binaries on PATH)
cp .dev.vars.example .dev.vars
npm run db:migrate
npm run dev
```

Then open <http://localhost:5173>. `/health` reports whether the app can reach its database.

The app does not read the steward's feed yet (story `06-ingest-feed`). When it does, it will read the steward's sample feed from `../daily-help-steward/fixtures/feed-sample/` when the steward is checked out next to this repo.

`.dev.vars` holds local secrets and is not committed. To use another Postgres (Docker, Postgres.app), point `DATABASE_URL` in `.dev.vars` at it. Postgres.app asks for permission each time a new program connects, which shows up as connection timeouts from the Workers runtime, so the private cluster is easier.

### Tests and checks

```sh
npm test            # unit and integration tests (Vitest; database tests run on PGlite, no server needed)
npm run e2e         # end-to-end journeys in a mobile browser against the built Worker (Playwright)
npm run lint        # Biome
npm run typecheck   # generated Worker and route types, then tsc
```

Before the first `npm run e2e`, run `npx playwright install chromium`. The journeys use the database in `.dev.vars`, so start it and apply migrations first (`npm run db:start`, `npm run db:migrate`).

### Database migrations

Tables are defined in `db/schema.ts`. After changing it, `npm run db:generate` writes a new SQL migration to `db/migrations/`; commit it with the change. `npm run db:migrate` applies pending migrations to `DATABASE_URL`, and the deploy job runs it before each deploy.

### Production setup (one time)

The app deploys to the `ashlanddailyhelp-app` Worker on every push to `main` once the `DATABASE_URL` repository secret is set. Until then the deploy job skips it with a notice. After each deploy the job checks that `/health` on the deployed app reaches the database, so set up the Worker's own connection (step 2) before the repository secret (step 3).

1. Create a Postgres database, for example on [Neon](https://neon.tech/).
2. Give the Worker its connection string, either as a secret (`npx wrangler secret put DATABASE_URL`) or, better, through a [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) configuration bound as `HYPERDRIVE` in `wrangler.jsonc`, which pools connections. When both are set, Hyperdrive wins. With a Hyperdrive binding, give it a `localConnectionString` so `npm run dev` still uses the local database.
3. Add the same connection string as the `DATABASE_URL` repository secret in GitHub, so the deploy job can run migrations.

## Deploys

GitHub Actions (`.github/workflows/deploy.yml`) runs lint, type checks, tests, the build and the end-to-end journeys on every push and pull request. On a push to `main` it then deploys:

- the static site from `legacy/` to <https://ashlanddailyhelp.kitchenlab.workers.dev> (the `ashlanddailyhelp` Worker), and
- the new app to the `ashlanddailyhelp-app` Worker, once `DATABASE_URL` is set.

The live domain, ashlanddailyhelp.com, is still served from Bluehost and is not touched by either. The workflow needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and `DATABASE_URL` for the app's migrations. Only `main` deploys, including manual runs.

## The static site

The static site in `legacy/` is plain HTML, CSS and ES modules with no build step or dependencies. Serve the folder over HTTP (the service worker needs `http(s):`, not `file:`):

```sh
python3 -m http.server 8000 --directory legacy
```

### With the steward feed

The site reads listings and Community Pulse from the steward's `listings.json` and `pulse.json`. Their location is the `FEED_BASE` constant at the top of `legacy/app.js`, defaulting to `./feed/`. To point at another host without editing code, add `<meta name="feed-base" content="https://feed.example.org/">` to `legacy/index.html`.

With no feed, the site uses `legacy/data.js` and the built-in fictional sample week. No feed is committed (`feed/` is ignored). To try it locally, either:

- copy the steward's sample feed into `legacy/feed/` and serve the site:

  ```sh
  mkdir -p legacy/feed && cp ../daily-help-steward/fixtures/feed-sample/*.json legacy/feed/
  python3 -m http.server 8000 --directory legacy
  ```

- or run the steward's reference feed server (`npm run steward -- serve` in `../daily-help-steward`) and set the `feed-base` meta tag to its URL.

How it behaves:

- **Find help** loads `listings.json` at startup: network first, then the copy cached on this device, then `data.js`. The service worker keeps the last good copy for offline use. The directory footer shows "Listings as of" the feed's `generatedAt`. Invalid JSON, a failed check or an unknown major version counts as a failed fetch.
- **Listing labels** come from the feed: `provenanceLabel`, `unconfirmed`, `mayBeCanceled`, `conflict` and `endsAt` (shown as an end time; the listing hides once it has passed).
- **Community Pulse** fetches `pulse.json` once at startup and every 30 seconds while Pulse is open and the tab is visible, with `If-None-Match` when the server sends an ETag. On errors it keeps what's on screen, marks it "Last updated", and backs off. `pulse.json` is never cached for offline use.
- **Sample wording** follows `pulse.json`'s `dataset`: `FICTIONAL_DEMONSTRATION` keeps every "sample" and "fictional" label; `LIVE` removes them, and the CSV download carries the real label.

### Static site deploys

- Files are served as committed. `legacy/.assetsignore` keeps `feed/`, Markdown, dotfiles and the deploy files out of the upload.
- Cloudflare sends `Cache-Control: public, max-age=0, must-revalidate` with an ETag for every file, so browsers check for updates on each visit. Returning visitors still pick up new shell files only when the cache name in `legacy/sw.js` changes.
- `legacy/worker.js` serves `/index.html` directly (Cloudflare would otherwise redirect it to `/`, which breaks the offline copy `sw.js` keeps). Every other path comes straight from the static files.
- To deploy by hand: `npx wrangler deploy -c legacy/wrangler.jsonc` (log in first with `npx wrangler login`).

## Data and accuracy

Listings say only what each provider's own website states, and none has been confirmed with the provider yet. Confirm hours and eligibility before visiting or referring anyone. The Community Pulse and provider-view numbers are fictional demonstration data, not real service statistics.

## License

Application code is MIT ([`LICENSE`](LICENSE)). Bundled fonts are under the SIL Open Font License ([`legacy/fonts/OFL.txt`](legacy/fonts/OFL.txt)).
