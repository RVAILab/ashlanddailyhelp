<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:17:22-07:00
  planned_at:   2026-10-25T12:17:22-07:00
  finished_at:  2026-10-25T12:20:35-07:00
  updated_at:   2026-10-25T12:20:35-07:00
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

- Filed as [RVAILab/daily-help-steward#42](https://github.com/RVAILab/daily-help-steward/issues/42) on 2026-10-25, with a workaround for the steward's demo meanwhile (`--site ../ashlanddailyhelp/legacy`).
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

## Review

Reviewed 2026-10-25 at `7b4008c` by an independent agent against #42 and the steward's code. Issue #42 was updated the same day.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Starting listings live in the steward | ✅ requested | Proposal 1, now including the fictional sample week |
| `fixtures/site-core/` and its tests replaced by contract-only tests | ✅ requested | Proposal 2, with every test file that imports the copies listed |
| FEED.md and `src/contract/` self-standing | ✅ requested | Proposals 3 and 5, with the specific passages listed |
| Site checks and `demo --site` retired or repointed | ✅ requested | Proposal 4 |
| Lands before `data.js` and `core.js` are deleted | ⚠️ | Tracked: `17-domain-cutover` waits for #42 to close |

All five claims about what breaks today checked out in the code. Findings, all addressed in the updated issue:

1. The sample feed's fictional week (`demoEvents`, `initialReports`) also comes from the copied `data.js`; the proposal now moves it too.
2. Nine test files, `tsconfig.json` and several docs depend on the copies; all are now listed.
3. The issue described the new app's feed reader as done; it now says it is being built.
4. The site-check workaround needed the web server started from inside `legacy/`; added.

## Learnings

- Went well: checking the steward's behaviour in its code, not from its docs, confirmed the demo really stops and found a workaround the steward can use today.
- Surprising: the dependency ran deeper than seeding listings: the steward's own sample feed, which this app tests against, is built from the site's old `data.js`.
- Next time: describe the other side's future state in the future tense; a request is read as a statement of fact.
- Open: the steward's owner still has to act on #42 before `17-domain-cutover` can delete `legacy/`.
