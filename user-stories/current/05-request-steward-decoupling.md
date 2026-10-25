<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:17:22-07:00
  planned_at:   2026-10-25T12:17:22-07:00
  finished_at:
  updated_at:   2026-10-25T12:17:22-07:00
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

File the request as an issue on RVAILab/daily-help-steward, listing each place the steward reads this repo's old files, now that they have moved to `legacy/` (`e94c35a`) and will be deleted at the domain cutover.

### Steps

1. Find every reference to this repo in the steward (`fixtures/site-core`, `importSiteListings` callers, `scripts/feed-sample.ts`, `scripts/site-check/`, `npm run demo -- --site`, the test reading `origin/main:core.js`), and check what each does now that the files moved.
2. File the issue: what changed, what breaks or silently skips, and the four proposed changes (seed listings in the steward, contract-only tests, a self-standing FEED.md, retire or repoint the site checks).
3. Link it from this story, and from `17-domain-cutover`, which must wait for it.

### Data model

None.

### Tests

None: this story produces a request, not code.

### Risks and open questions

- Until the steward changes, its `feed:sample` keeps the vendored copies and the drift test is skipped, so nothing fails loudly; the issue says so.
- "Lands before `data.js` and `core.js` are deleted" is enforced by `17-domain-cutover` checking the issue is closed.
