<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Decouple the Steward from the Old Site Files

## Summary

AS the steward's owner
I WANT the steward to stop depending on this repo's `data.js` and `core.js`
SO THAT replacing the static site doesn't silently break the steward's seed data and tests

## Acceptance Criteria

- The steward's starting listings (today's `data.js` resources) live in the steward, and `importSiteListings` reads them from there (`src/cli.ts`, `src/demo/index.ts`, `scripts/packet-alert.ts`).
- `fixtures/site-core/` and the test that compares it with this repo's `main` are removed or replaced by contract-only tests.
- `docs/FEED.md` and `src/contract/` describe the format on its own terms, not as "the fields of `data.js`" or "the arrays `aggregateReports` takes".
- `scripts/site-check/` and `npm run demo -- --site` are retired or pointed at the new app.
- This lands before this repo deletes `data.js` and `core.js`.

## Notes

- The work happens in the steward repo; this story tracks the request.
- The `SITE_UNITS` limit and the event-id character rule exist only for the old `core.js`; the new app can relax them later.

## Implementation Plan

[to be filled in by /stories plan]
