<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T12:17:53-07:00
-->

# Story: Move ashlanddailyhelp.com to the New App

## Summary

AS the Daily Help team
I WANT ashlanddailyhelp.com to serve the new app
SO THAT everyone gets the new app at the address they already know

## Acceptance Criteria

- Before DNS changes, everything else Bluehost does for the domain (email and its MX records, other sites or subdomains) is listed and kept working.
- ashlanddailyhelp.com and www are custom domains on the Cloudflare Worker, served over HTTPS, with the zone moved to Cloudflare or pointed at it.
- Old URLs redirect: `?view=`, `?resource=`, `?category=`, `?q=` and `?list=` land on the matching new pages.
- Returning visitors' old service worker is replaced and its `hub-preview-*` caches are cleared.
- The old static files (`data.js`, `core.js`, `app.js`, the CSS files, `sw.js`, `build.json`) are removed from this repo, after `05-request-steward-decoupling` lands, along with `worker.js`'s `/index.html` workaround, which exists only for the old `sw.js`.
- The Bluehost hosting is shut down only after the domain is confirmed serving from Cloudflare.
- This repo's CLAUDE.md and README, and RogueRaise's `2026-10-unhoused/RESOURCES.md`, describe the new app.
- The steward's CORS allow-list and feed URL match the production setup.

## Notes

- Removing `legacy/` waits for [RVAILab/daily-help-steward#42](https://github.com/RVAILab/daily-help-steward/issues/42) to close.
- Today ashlanddailyhelp.com is served from Bluehost (Apache), and every push to `main` deploys to <https://ashlanddailyhelp.kitchenlab.workers.dev> (README, PR #2). Only the domain needs to move.
- The steward README's "Upload to Bluehost" feed option no longer applies once the site leaves Bluehost.

## Implementation Plan

[to be filled in by /stories plan]
