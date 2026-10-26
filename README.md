# Ashland Daily Help

A community resource hub for Ashland, Oregon: food, showers, shelter and someone who knows the way. Live at <https://ashlanddailyhelp.com>.

This repo holds two things:

- **The app** (repo root): a full-stack TypeScript app on Cloudflare Workers, with React rendered on the server and Postgres. It reads curated data from the steward and serves it at ashlanddailyhelp.com. All new work goes here.
- **The static site** ([`legacy/`](legacy/)): the original site built at Rogue Raise, still deployed to its own Worker because the steward reads its files (steward #42). See [`legacy/README.md`](legacy/README.md).

## What it does

Every page is in English and Spanish, works on old phones and weak connections, and keeps working offline once visited.

- **Find help** (`/resources`, `/resources/<id>`): search and browse listings, each saying where its details came from and what isn't confirmed.
- **Open today** (`/today`): what's open now and later today, scheduled events and current alerts.
- **What's next** (`/next`): just the next meal and the next place to sleep.
- **Ask a question** (`/ask`, and by text message at `/sms`): plain answers from the directory, crisis numbers first.
- **Navigator assistant** (`/navigator`): fuller answers with sources, for caseworkers and outreach workers.
- **My list and printable sheet** (`/list`, `/print`): save listings, share them as a link, or print a handout.
- **Community Pulse** (`/pulse`): how scheduled services went each week, as providers report it.
- **Check your listing** (`/providers`, `/report`): providers see what the public sees and send corrections.
- **Text-only version** (the link in every page's footer): the same pages without pictures, to save data, remembered in a cookie.

`/health` reports whether the app can reach its database.

## Origin

Built at [Rogue Raise: The Unhoused](https://whiterabbitashland.com/rogue-raise) (October 23–25, 2026), White Rabbit's weekend community build in Ashland. Event notes, team links, hotlines and a dated snapshot of the local resource directory live in the sibling repo [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise), under [`2026-10-unhoused/`](https://github.com/RVAILab/RogueRaise/tree/main/2026-10-unhoused). Locally it is usually checked out next to this repo at `../RogueRaise`.

## Backend

Collecting, organizing and resolving resources and events is the job of a separate app, [RVAILab/daily-help-steward](https://github.com/RVAILab/daily-help-steward). It harvests what providers already publish, routes changes through human review, and publishes a feed (contract: the steward's [`docs/FEED.md`](https://github.com/RVAILab/daily-help-steward/blob/main/docs/FEED.md)). This app only reads that feed.

The feed is a folder, <https://steward.ashlanddailyhelp.com/feed/>, which has no index page of its own (the folder URL answers 404). It holds:

| File | Status |
|---|---|
| [`listings.json`](https://steward.ashlanddailyhelp.com/feed/listings.json) | Published |
| [`pulse.json`](https://steward.ashlanddailyhelp.com/feed/pulse.json) and `weeks/*.json` | Published |
| `events.json` | Proposed (steward #40); not published yet |
| `alerts.json` | Proposed (steward #41); not published yet |

## Working on the app

React Router 8 (framework mode) on a Cloudflare Worker, Drizzle ORM over Postgres, Vitest, Playwright and Biome.

| Folder | What's in it |
|---|---|
| `app/` | Routes, components, interface text (`app/i18n/`) |
| `server/` | Server-only code: feed ingest, search, chat, translation |
| `workers/` | The Worker entry: requests and the scheduled feed refresh |
| `db/` | Tables and migrations |
| `contract/`, `test/fixtures/feed-sample/` | Copies of the steward's feed contract and sample feed |
| `test/fixtures/feed-live/` | A daily snapshot of the live feed, for the journeys and real-data tests |
| `e2e/` | Playwright journeys |
| `eval/` | The chat evaluation set |
| `user-stories/` | User stories, managed with `/stories` (board: `user-stories/index.html`) |

We work test-first, in small commits straight to `main`, which deploys on every push. [`CLAUDE.md`](CLAUDE.md) and the `CLAUDE.md` in each folder describe how we work and the rules for each part of the code.

### Running locally

You need Node 24 and Postgres 15 or newer.

```sh
npm install
git config core.hooksPath .githooks   # runs npm run check before every push
npm run db:start                      # a private Postgres cluster in .postgres/ on port 5433 (needs the postgres binaries on PATH)
cp .dev.vars.example .dev.vars
npm run db:migrate
npm run feed:ingest                   # loads the steward's live feed
npm run dev
```

Then open <http://localhost:5173>. Spanish pages are under `/es`.

`.dev.vars` holds local secrets and is not committed. To use another Postgres (Docker, Postgres.app), point `DATABASE_URL` in `.dev.vars` at it. Postgres.app asks for permission each time a new program connects, which shows up as connection timeouts from the Workers runtime, so the private cluster is easier.

### The steward's feed

The app keeps a copy of the steward's feed in Postgres. A scheduled Worker refreshes it every 5 minutes from `FEED_BASE_URL`, a Worker variable naming the feed folder (with or without a trailing slash), with `If-None-Match`. It keeps the last good copy when a fetch fails or a file doesn't match the contract. A file the steward doesn't publish yet (a 404 for `events.json` or `alerts.json`) is recorded quietly as not published. Each page's footer (except a server-error page) says "Listings as of" the copy's `generatedAt`, warns when the latest update failed, and says so when no copy has loaded or the database is unavailable.

To load a feed by hand:

```sh
npm run feed:ingest                                   # the steward's live feed
npm run feed:ingest -- test/fixtures/feed-sample      # the sample feed the tests use
npm run feed:ingest -- ../daily-help-steward/fixtures/feed-sample
```

To try the scheduled refresh locally, add `FEED_BASE_URL` to `.dev.vars` (for example a `python3 -m http.server` serving a feed folder), run `npm run dev`, and open `/cdn-cgi/local/scheduled`.

The steward's contract (`contract/steward/`) and sample feed (`test/fixtures/feed-sample/`) are copies. After the steward changes either, run `npm run feed:sync` with the steward checked out at `../daily-help-steward`; a test fails while the copies differ.

### Languages

Every page is in English and Spanish: English at the plain URLs (`/resources`), Spanish under `/es` (`/es/resources`).

- Arriving from outside the site at an English page, a visitor whose saved choice or browser prefers Spanish is sent to the Spanish page. Moving around within the site never redirects, so English stays reachable even without cookies.
- The language link in each page's header switches, and the choice is remembered in a `lang` cookie.
- Interface text lives in `app/i18n/en.ts` and `app/i18n/es.ts`. The Spanish catalog was written carefully but has not yet been reviewed by a Spanish speaker; please do before launch.
- Listing text from the feed is in English. After each feed refresh, the scheduled Worker machine-translates new or changed listing text into Spanish with Claude (`TRANSLATION_MODEL` in `server/translate/claude.ts`) when the Worker has an `ANTHROPIC_API_KEY` secret. Each distinct text is translated once (keyed by a hash of the English), and a run sends at most 200 texts, logging how many it sent and the tokens used.
- Spanish pages show the translation labelled "Traducción automática" with a link to the English, and the English, marked as English, until a translation exists. A Spanish speaker should spot-check the translations before launch.

### Chat on the website and by text

`/ask` and `/navigator` answer questions from the directory, and so does `/sms` for text messages. All use one answering service (`server/chat/`, with Claude). They need the Worker's `ANTHROPIC_API_KEY` secret; without it, asking says it isn't available. Each connection, or each phone number (seen only as a hash), may ask 10 questions a minute (`ASK_LIMIT` in `wrangler.jsonc`). Nothing about a question or the person asking is stored. Before changing the prompt, retrieval or model, run `npm run chat:eval`.

To answer texts, connect a Twilio number once:

1. In Twilio, buy a number and set its messaging webhook ("A message comes in") to `https://ashlanddailyhelp.com/sms`, HTTP POST.
2. `npx wrangler secret put TWILIO_AUTH_TOKEN` with the account's auth token, which signs every webhook. Without it, `/sms` answers 503.
3. Text the number "HELP", then a question.

Twilio handles STOP and START for the number itself. In the number's Advanced Opt-Out settings, turn off Twilio's own HELP reply, since the site answers HELP with the crisis numbers. Replies are plain text, at most three segments. A text not answered within 12 seconds gets the 211 answer, because Twilio stops waiting at 15.

### Tests and checks

```sh
npm test            # unit and integration tests (Vitest; database tests run on PGlite, no server needed)
npm run coverage    # the same, with a coverage summary here and a report in coverage/index.html
npm run e2e         # end-to-end journeys in a mobile browser against the built Worker (Playwright)
npm run lint        # Biome
npm run typecheck   # generated Worker and route types, then tsc
npm run check       # lint, typecheck and tests: the pre-push hook runs it
```

Before the first `npm run e2e`, run `npx playwright install chromium`. The journeys use the database in `.dev.vars`, so start it first (`npm run db:start`). Their setup applies migrations to that database and replaces its listings with the live snapshot.

Locally, both suites start by refreshing `test/fixtures/feed-live/`, a copy of the steward's live feed, when its `snapshot.json` is more than a day old; if the steward can't be reached or a file doesn't match the contract, they keep the old copy. Commit the refreshed snapshot. CI (`CI` set) never refreshes it: it tests the committed copy, however old, so a build never depends on the steward. After that, nothing in a run reaches the network: in Vitest `fetch` refuses anything but localhost, the journeys' browser resolves only localhost, and the preview server sends chat calls to a closed local port.

### Database migrations

Tables are defined in `db/schema.ts`. After changing it, `npm run db:generate` writes a new SQL migration to `db/migrations/`; commit it with the change, and never edit a migration that has been applied. `npm run db:migrate` applies pending migrations to `DATABASE_URL`, and the deploy job runs it before each deploy.

## Deploys

GitHub Actions (`.github/workflows/deploy.yml`) runs lint, type checks, tests and the build on every push and pull request. The end-to-end journeys run locally (`npm run e2e`) for now, not in CI. On a push to `main` it then deploys:

- the app to the `ashlanddailyhelp-app` Worker, which serves ashlanddailyhelp.com and www (custom domains in `wrangler.jsonc`) and <https://ashlanddailyhelp-app.kitchenlab.workers.dev>, and
- the static site from `legacy/` to <https://ashlanddailyhelp.kitchenlab.workers.dev> (the `ashlanddailyhelp` Worker).

The workflow needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and `DATABASE_URL` for the app's migrations; without `DATABASE_URL` it skips the app with a notice. After each deploy it checks that `/health` on the deployed app reaches the database. Only `main` deploys, including manual runs.

### Production setup

This was done once by hand; follow it to set up a new environment.

1. Create a Postgres database, for example on [Neon](https://neon.tech/).
2. Give the Worker its connection string, either as a secret (`npx wrangler secret put DATABASE_URL`) or, better, through a [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) configuration bound as `HYPERDRIVE` in `wrangler.jsonc`, which pools connections. When both are set, Hyperdrive wins. With a Hyperdrive binding, give it a `localConnectionString` so `npm run dev` still uses the local database. Do this before step 3, since the deploy job's health check needs it.
3. Add the same connection string as the `DATABASE_URL` repository secret in GitHub, so the deploy job can run migrations.
4. Set the Worker variable `FEED_BASE_URL` to the steward's feed folder (in `wrangler.jsonc` under `vars`; it is set to `https://steward.ashlanddailyhelp.com/feed/`).
5. Add the Worker secrets the features need: `ANTHROPIC_API_KEY` (chat and translation), `TWILIO_AUTH_TOKEN` (texts, above) and, optionally, `CORRECTIONS_EMAIL`, the address the email link on `/report` writes to. Without it, `/report` offers no email link.

## Data and accuracy

Listings say only what each provider's own website states, and none has been confirmed with the provider yet. Confirm hours and eligibility before visiting or referring anyone. When the feed's `dataset` is `FICTIONAL_DEMONSTRATION`, every page that shows its data says so; those numbers are not real service statistics.

## License

Application code is MIT ([`LICENSE`](LICENSE)). Bundled fonts are under the SIL Open Font License ([`public/fonts/OFL.txt`](public/fonts/OFL.txt) for the app, [`legacy/fonts/OFL.txt`](legacy/fonts/OFL.txt) for the static site).
