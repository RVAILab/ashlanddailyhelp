<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Ingest the Steward Feed

## Summary

AS the app
I WANT to fetch the steward's feed on a schedule and keep its current state in Postgres
SO THAT pages and search are fast, and keep working when the steward is slow or down

## Acceptance Criteria

- A scheduled Worker fetches each feed file from one configurable base URL every few minutes, sending `If-None-Match`; a 304 changes nothing.
- Each file is checked against the steward's contract before anything is written: schema version major 1, the steward's JSON Schema (`schema/feed/`). A file that fails, or has an unknown major version, is treated like a failed fetch and logged.
- A valid file replaces the stored state in one transaction, so a page never sees half a feed. Listings dropped from the feed disappear.
- If a fetch fails, the app keeps serving the last good copy and pages show "as of" its `generatedAt`.
- Every steward field is stored, including the optional ones (`provenanceLabel`, `unconfirmed`, `mayBeCanceled`, `endsAt`, `sourceUrls`, `provenance`, `lastConfirmed`). Fields the app doesn't know are ignored without failing.
- Listings whose `endsAt` has passed are hidden, even before the next refresh.
- The feed's `dataset` (`FICTIONAL_DEMONSTRATION` or `LIVE`) is stored and available to every page for labelling.
- Tests run the ingest against the steward's `fixtures/feed-sample/`, including invalid and unknown-version files.
- New feed files from `1-request-events-feed` and `1-request-alerts-feed` are ingested the same way once they exist.

## Notes

- Contract: `../daily-help-steward/docs/FEED.md` and `src/contract/feed.ts`. As a server-side consumer, FEED.md rule 8 applies.
- Current state only; no history. `pulse.json` is not ingested until `4-community-pulse`.
- Overlaps `backlog/store-community-resources-in-db.md` (Oct 24). Merge it into this story or delete it.

## Implementation Plan

[to be filled in by /stories plan]
