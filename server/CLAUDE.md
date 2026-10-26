# Server code

Everything here runs only in the Worker (or Node scripts and tests). Route modules may use it from `loader`, `action` and `meta`, which React Router strips from the browser bundle, but never from a component or anything a component imports.

## The feed

`server/feed/` refreshes each feed file into Postgres with `refreshFeedFile` (`ingest.ts`) and a per-file `FeedFileSpec` (`listingsFile`, `eventsFile` in `events.ts`, `alertsFile`, and the pulse). The Worker's `scheduled` handler runs them every 5 minutes from `FEED_BASE_URL` (`run.ts`), keeping the last good copy when a fetch fails or a file doesn't match the contract.

- `contract/steward/` is a verbatim copy of the steward's zod contract and `test/fixtures/feed-sample/` of its sample feed. Refresh both with `npm run feed:sync`; never edit them by hand. A test fails while they differ from the steward.
- `server/feed/contract.ts` first drops fields it doesn't know, at every level, then applies the steward's own strict schema (refinements included) to the rest. Extend it when the contract gains nested objects.
- Every read of listings filters with `isCurrent(now)` (`server/feed/listings.ts`), which hides listings past `endsAt`.
- Listings, events and alerts are filtered to Ashland with `server/listings/scope.ts`.

## Listings

Search is `searchListings` in `server/listings/search.ts` (Postgres full-text search over the generated `search` and `words` columns); one listing is `findListing` in `server/listings/listing.ts`.

## Chat

`server/chat/answerQuestion` is the one answering service for every channel (`/ask`, `/navigator`, `/sms`). It retrieves matching listings, events and alerts from Postgres and lets Claude (`server/chat/claude.ts`) answer only from them. Code, not the model, puts crisis numbers first (`crisis.ts`), falls back to 211, and keeps only citations that were retrieved. Nothing about a conversation is stored, and logs carry counts and timings only.

Before changing the prompt, retrieval or model, run `npm run chat:eval` (`eval/chat.json`, real API calls, a few cents) and keep it passing. Add a case for every wrong answer found.

## Database

Tables are in `db/schema.ts`, migrations in `db/migrations/` (Drizzle ORM and drizzle-kit). Generate migrations with `npm run db:generate`, never `drizzle-kit generate` directly: the script adds the final newline drizzle-kit leaves off. In the Worker, postgres.js connects through the `HYPERDRIVE` binding or the `DATABASE_URL` secret (`server/request-database.ts`).

Test queries against a real database, not mocks: `test/db.ts` gives a PGlite database with every migration applied.
