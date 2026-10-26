# Ashland Daily Help

A community resource hub for Ashland and Jackson County, Oregon: food, showers, shelter and someone who knows the way.

This repo holds two things:

- **The new app** (repo root): a full-stack TypeScript app on Cloudflare Workers, with React rendered on the server and Postgres. It reads curated data from the steward and serves it to the public. Its user stories are in [`user-stories/`](user-stories/).
- **The static site** ([`legacy/`](legacy/)): the original installable, offline-capable site built at Rogue Raise. It stays live until the new app replaces it. See [`legacy/README.md`](legacy/README.md).

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

Then open <http://localhost:5173>. The pages are the homepage, `/resources` (search), `/resources/<id>` (one listing) and `/about`, each also under `/es`; `/health` reports whether the app can reach its database.

### The steward's feed

The app keeps a copy of the steward's feed in Postgres. A scheduled Worker refreshes it every 5 minutes from `FEED_BASE_URL`, a Worker variable naming the folder that holds `listings.json` (with or without a trailing slash), with `If-None-Match`. It keeps the last good copy when a fetch fails or a file doesn't match the contract. Each page's footer (except a server-error page) says "Listings as of" the copy's `generatedAt`, warns when the latest update failed, and says so when no copy has loaded or the database is unavailable.

To load a feed by hand:

```sh
npm run feed:ingest                                   # the sample feed copied into test/fixtures/feed-sample/
npm run feed:ingest -- ../daily-help-steward/fixtures/feed-sample
npm run feed:ingest -- https://feed.example.org/feed/
```

To try the scheduled refresh locally, add `FEED_BASE_URL` to `.dev.vars` (for example a `python3 -m http.server` serving a feed folder), run `npm run dev`, and open `/cdn-cgi/local/scheduled`.

The steward's contract (`contract/steward/`) and sample feed (`test/fixtures/feed-sample/`) are copies. After the steward changes either, run `npm run feed:sync` with the steward checked out at `../daily-help-steward`; a test fails while the copies differ.

`.dev.vars` holds local secrets and is not committed. To use another Postgres (Docker, Postgres.app), point `DATABASE_URL` in `.dev.vars` at it. Postgres.app asks for permission each time a new program connects, which shows up as connection timeouts from the Workers runtime, so the private cluster is easier.

### Languages

Every page is in English and Spanish: English at the plain URLs (`/resources`), Spanish under `/es` (`/es/resources`). Arriving from outside the site at an English page, a visitor whose saved choice or browser prefers Spanish is sent to the Spanish page; moving around within the site never redirects, so English stays reachable even without cookies. The language link in each page's header switches, and the choice is remembered in a `lang` cookie. (Error pages for a server failure have no header or footer.) Listing text from the feed is in English. After each feed refresh, the scheduled Worker machine-translates new or changed listing text into Spanish with Claude (`claude-opus-5-5`) when the Worker has an `ANTHROPIC_API_KEY` secret (`npx wrangler secret put ANTHROPIC_API_KEY`). Each distinct text is translated once (translations are keyed by a hash of the English), and a run sends at most 200 texts, logging how many it sent and the tokens used. Spanish pages show the translation labelled "Traducción automática" with a link to the English, and the English, marked as English, until a translation exists. A Spanish speaker should spot-check the translations before launch.

Interface text lives in `app/i18n/en.ts` and `app/i18n/es.ts`. To add a string, add it to both (the type checker fails if Spanish lacks a key) and read it with `useI18n()` in components, or `messagesFor(lang)` in loaders and `meta`. The Spanish catalog was written carefully but has not yet been reviewed by a Spanish speaker; please do before launch.

### Chat on the website and by text

`/ask` answers questions in plain words from the directory, and so does `/sms` for text messages. Both use one answering service (`server/chat/`, with Claude). They need the Worker's `ANTHROPIC_API_KEY` secret; without it, asking says it isn't available. Each connection, or each phone number (seen only as a hash), may ask 10 questions a minute (`ASK_LIMIT` in `wrangler.jsonc`). Nothing about a question or the person asking is stored. Before changing the prompt, retrieval or model, run `npm run chat:eval`.

To answer texts, connect a Twilio number once:

1. In Twilio, buy a number and set its messaging webhook ("A message comes in") to `https://ashlanddailyhelp.com/sms`, HTTP POST.
2. `npx wrangler secret put TWILIO_AUTH_TOKEN --name ashlanddailyhelp-app` with the account's auth token, which signs every webhook. Without it, `/sms` answers 503.
3. Text the number "HELP", then a question.

Twilio handles STOP and START for the number itself. In the number's Advanced Opt-Out settings, turn off Twilio's own HELP reply, since the site answers HELP with the crisis numbers. Replies are plain text, at most three segments. A text not answered within 12 seconds gets the 211 answer, because Twilio stops waiting at 15.

### Tests and checks

```sh
npm test            # unit and integration tests (Vitest; database tests run on PGlite, no server needed)
npm run e2e         # end-to-end journeys in a mobile browser against the built Worker (Playwright)
npm run lint        # Biome
npm run typecheck   # generated Worker and route types, then tsc
npm run check       # lint, typecheck and tests: run before every push
```

Every push to `main` deploys, so `.githooks/pre-push` runs `npm run check`. Enable it once per clone with `git config core.hooksPath .githooks`.

Before the first `npm run e2e`, run `npx playwright install chromium`. The journeys use the database in `.dev.vars`, so start it and apply migrations first (`npm run db:start`, `npm run db:migrate`). Their setup applies migrations to that database and replaces its listings with the sample feed.

### Database migrations

Tables are defined in `db/schema.ts`. After changing it, `npm run db:generate` writes a new SQL migration to `db/migrations/`; commit it with the change, and never edit a migration that has been applied. `npm run db:migrate` applies pending migrations to `DATABASE_URL`, and the deploy job runs it before each deploy.

### Production setup (one time)

The app deploys to the `ashlanddailyhelp-app` Worker on every push to `main` once the `DATABASE_URL` repository secret is set. Until then the deploy job skips it with a notice. After each deploy the job checks that `/health` on the deployed app reaches the database, so set up the Worker's own connection (step 2) before the repository secret (step 3).

1. Create a Postgres database, for example on [Neon](https://neon.tech/).
2. Give the Worker its connection string, either as a secret (`npx wrangler secret put DATABASE_URL`) or, better, through a [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) configuration bound as `HYPERDRIVE` in `wrangler.jsonc`, which pools connections. When both are set, Hyperdrive wins. With a Hyperdrive binding, give it a `localConnectionString` so `npm run dev` still uses the local database.
3. Add the same connection string as the `DATABASE_URL` repository secret in GitHub, so the deploy job can run migrations.
4. Once the steward publishes its feed, set the Worker variable `FEED_BASE_URL` to the folder that holds `listings.json` (in `wrangler.jsonc` under `vars`, or in the Cloudflare dashboard).

## Deploys

GitHub Actions (`.github/workflows/deploy.yml`) runs lint, type checks, tests and the build on every push and pull request. The end-to-end journeys run locally (`npm run e2e`) for now, not in CI. On a push to `main` it then deploys:

- the static site from `legacy/` to <https://ashlanddailyhelp.kitchenlab.workers.dev> (the `ashlanddailyhelp` Worker), and
- the new app to the `ashlanddailyhelp-app` Worker, once `DATABASE_URL` is set. The app serves the live domain, ashlanddailyhelp.com and www (custom domains in `wrangler.jsonc`), and also <https://ashlanddailyhelp-app.kitchenlab.workers.dev>.

 The workflow needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and `DATABASE_URL` for the app's migrations. Only `main` deploys, including manual runs.

## Data and accuracy

Listings say only what each provider's own website states, and none has been confirmed with the provider yet. Confirm hours and eligibility before visiting or referring anyone. The Community Pulse and provider-view numbers are fictional demonstration data, not real service statistics.

## License

Application code is MIT ([`LICENSE`](LICENSE)). Bundled fonts are under the SIL Open Font License ([`legacy/fonts/OFL.txt`](legacy/fonts/OFL.txt)).
