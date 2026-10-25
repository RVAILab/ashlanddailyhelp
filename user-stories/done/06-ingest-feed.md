<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:20:46-07:00
  planned_at:   2026-10-25T12:21:28-07:00
  finished_at:  2026-10-25T12:47:25-07:00
  updated_at:   2026-10-25T12:47:25-07:00
-->

# Story: Ingest the Steward Feed

## Summary

AS the app
I WANT to fetch the steward's feed on a schedule and keep its current state in Postgres
SO THAT pages and search are fast, and keep working when the steward is slow or down

## Acceptance Criteria

- Postgres tables hold the community resources and their evidence fields as the app's single store for them, created by migrations in the repo, with queries tested against a real Postgres.
- A scheduled Worker fetches each feed file from one configurable base URL every few minutes, sending `If-None-Match`; a 304 changes nothing.
- Each file is checked against the steward's contract before anything is written: schema version major 1, the steward's JSON Schema (`schema/feed/`). A file that fails, or has an unknown major version, is treated like a failed fetch and logged.
- A valid file replaces the stored state in one transaction, so a page never sees half a feed. Listings dropped from the feed disappear.
- If a fetch fails, the app keeps serving the last good copy and pages show "as of" its `generatedAt`.
- Every steward field is stored, including the optional ones (`provenanceLabel`, `unconfirmed`, `mayBeCanceled`, `endsAt`, `sourceUrls`, `provenance`, `lastConfirmed`). Fields the app doesn't know are ignored without failing.
- Listings whose `endsAt` has passed are hidden, even before the next refresh.
- The feed's `dataset` (`FICTIONAL_DEMONSTRATION` or `LIVE`) is stored and available to every page for labelling.
- Tests run the ingest against the steward's `fixtures/feed-sample/`, including invalid and unknown-version files.
- New feed files from `03-request-events-feed` and `04-request-alerts-feed` are ingested the same way once they exist.

## Notes

- Contract: `../daily-help-steward/docs/FEED.md` and `src/contract/feed.ts`. As a server-side consumer, FEED.md rule 8 applies.
- Current state only; no history. `pulse.json` is not ingested until `23-community-pulse`.
- Absorbs the Oct 24 story "Store Community Resources in DB" (a central Postgres store for community resource data).

## Implementation Plan

A scheduled Worker fetches `listings.json` from the feed's base URL with `If-None-Match`, checks it against the steward's own zod contract (copied into this repo), and replaces the stored listings in one transaction. Ingest is written per feed file, so `events.json` and `alerts.json` plug in the same way when `13-today-events` and `14-today-alerts` need them. Every page gets the feed's `generatedAt` and `dataset` from the root loader for an "as of" line.

### Steps

1. Copy the steward's contract (`src/contract/feed.ts`, `src/contract/values.ts`) into `contract/steward/` and its sample feed into `test/fixtures/feed-sample/`, with `scripts/sync-steward.sh` to refresh both and a test that fails when they differ from `../daily-help-steward` (skipped when it isn't checked out). The steward's zod schemas are the source of its JSON Schema, so checking against them is checking against the contract.
2. `server/feed/contract.ts`: consumer schemas built from the steward's shapes but with `z.object` instead of `z.strictObject`, so unknown fields are dropped instead of failing (a minor version can add fields), plus a clear "unknown major version" check before schema validation.
3. `db/schema.ts` and a migration: `feed_files` (one row per file: ETag, schema version, `generatedAt`, dataset, when stored and checked, last error) and `listings` (id, feed position, `ends_at`, and the whole validated listing as `jsonb`, so every steward field is stored).
4. `server/feed/ingest.ts`: `refreshFeedFile(spec, deps)` fetches with the stored ETag; 304 records the check; a failed fetch, invalid JSON, an unknown major or a schema failure records and logs the error and leaves the stored copy alone; a valid file is stored in one transaction. `server/feed/listings.ts` is the listings spec, plus `currentListings(db, now)`, which leaves out listings whose `endsAt` has passed.
5. `workers/app.ts`: a `scheduled` handler running the ingest every 5 minutes (`triggers.crons` in `wrangler.jsonc`), with the base URL in the `FEED_BASE_URL` variable; without one it logs and does nothing.
6. `app/root.tsx`: a root loader returning the listings file's `generatedAt` and `dataset` (or nothing, if the database or the feed isn't there), shown in a footer on every page: "Listings as of …", and a note when the data is a demonstration.
7. `scripts/ingest.ts` (`npm run feed:ingest -- <url or folder>`): run the same ingest by hand, from a URL or a local folder such as the steward's sample feed. Playwright's global setup uses it to load `test/fixtures/feed-sample/` before the journeys.
8. README and CLAUDE.md: the feed base URL, the sync script, and `feed:ingest`.

### Data model

- `feed_files`: `name` (primary key, for example `listings.json`), `etag`, `schema_version`, `generated_at`, `dataset`, `stored_at`, `checked_at`, `last_error`, `last_error_at`.
- `listings`: `id` (primary key), `position`, `ends_at`, `data` (`jsonb`, the listing as validated).

### Tests

- `server/feed/ingest.test.ts` (PGlite and a fake `fetch`): stores the sample feed; sends the stored ETag and changes nothing on 304; keeps the last good copy and records the error on a network failure, a 500, invalid JSON, a schema failure and an unknown major version; drops listings missing from a new feed; ignores unknown fields; keeps every optional steward field; stores the dataset.
- `server/feed/listings.test.ts`: `currentListings` hides a listing once `endsAt` has passed.
- `contract/steward.test.ts`: the copies match the steward checkout.
- `app/root.test.tsx`: the footer shows "as of" and the demonstration note, and says when no listings have loaded.
- `e2e/smoke.spec.ts`: after loading the sample feed, the homepage shows "Listings as of".

### Risks and open questions

- Production has no feed URL yet: the steward isn't hosted (steward #24). The scheduled ingest runs and logs until `FEED_BASE_URL` is set.
- "The steward's JSON Schema" is checked through the zod schemas it is generated from; a zod and JSON Schema mismatch on the steward's side is the steward's test to catch (it has one).

## Review

Reviewed 2026-10-25 at `65161d1` by an independent agent; every finding was checked and fixed in `4387057` unless noted.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Postgres tables and migrations, queries tested on a real Postgres | ✅ | `db/schema.ts`, `db/migrations/0000_feed.sql`, PGlite in `test/db.ts`; postgres.js in the end-to-end job |
| Scheduled fetch from one base URL, `If-None-Match`, 304 changes nothing | ✅ | `wrangler.jsonc` cron, `workers/app.ts` `scheduled`, `server/feed/ingest.ts`; tests for the first fetch (no ETag) and a 304 |
| Contract check before writing; failures and unknown majors treated as failed fetches and logged | ✅ | `parse` in `server/feed/ingest.ts`; checked with the steward's zod schemas (its JSON Schema is generated from them) |
| One transaction; dropped listings disappear | ✅ | Rollback test: a store failing after the delete keeps the last good copy |
| Last good copy kept; pages show "as of" | ✅ | Ingest failure tests; the footer on every page, including not found (end-to-end) |
| Every field stored; unknown fields ignored | ✅ | Optional fields kept; unknown fields dropped at every depth, then the steward's strict schema applied |
| Listings past `endsAt` hidden before the next refresh | ✅ | `currentListings`, boundary test |
| `dataset` stored and on every page | ✅ | Footer demonstration note; the root error boundary (a real server error) shows 211 instead |
| Tests use the sample feed, including invalid and unknown versions | ✅ | `test/fixtures/feed-sample/`, the failure cases in `server/feed/ingest.test.ts` |
| Events and alerts files ingested the same way | ⚠️ | `FeedFileSpec` is the plug-in point; the files don't exist yet (steward #40, #41) |

Findings:

1. Fixed: an unknown field nested in `provenance` rejected the whole file and would have frozen the copy. Unknown fields are now dropped at every depth before the steward's schema runs.
2. Fixed: every page waited on the database with no timeout. Connections time out after 5 s and statements after 10 s, the footer's status read gives up after 2 s, the root loader catches errors opening the database, and it isn't reloaded when only the URL changes.
3. Fixed: `FEED_BASE_URL` without a trailing slash fetched the parent folder's file, and an invalid URL escaped the error record. It is now treated as a folder and validated.
4. Fixed: the CLI dropped request headers and the timeout for http(s) feeds.
5. Fixed: database errors outside the main `try`, or while recording an error, escaped; they are now caught and logged.
6. Fixed: a timed-out or reset body was reported as invalid JSON, and contract errors could be unbounded. Errors are now specific and at most 500 characters.
7. Fixed: a 304 didn't clear a recorded error.
8. Fixed: the footer's time was formatted in both the Worker and the browser, risking a hydration mismatch; it is formatted once, in the loader.
9. Fixed: the duplicate-id rule was copied by hand; the steward's own refinement now runs.
10. Fixed: overlapping refreshes could collide; they now take an advisory lock.
11. Fixed: two types named `FeedHeader`, and an unstyled footer class.
12. Fixed: missing tests (rollback, root loader, first fetch, timeouts, roles in the footer test, the not-found page).
13. Process: two pushed commits were red (an over-broad `feed/` ignore rule left `server/feed/` uncommitted, then a formatting failure). `npm run check` and a pre-push hook now run lint, types and tests before every push.
14. Fixed: the footer now gives the year and time zone in a `<time>` element, warns when the latest update failed, and tells "no listings yet" apart from "unavailable" (with 211). The demonstration label next to listings comes with `07-browse-and-search`.
15. Fixed: README and CLAUDE.md statements (the local scheduled URL, the folder URL, what loosening covers, that only `listings.json` is refreshed so far, that the end-to-end setup replaces local listings).

## Learnings

- Went well: building ingest around a per-file spec kept failure handling in one place, and testing it against the steward's real sample feed caught the strictness problem before a real 1.4 feed would have.
- Surprising: a `.gitignore` rule written for the old site (`feed/`) silently ignored `server/feed/`, and Biome, which reads `.gitignore`, skipped linting it too, so local checks passed on code that was never committed.
- Next time: run `npm run check` from a clean clone of what's committed (or look at `git status` for untracked source) before pushing; the pre-push hook now covers the checks, and anchoring ignore rules to the root avoids the rest.
