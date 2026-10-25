<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Move ashlanddailyhelp.com to the New App

## Summary

AS the Daily Help team
I WANT ashlanddailyhelp.com to serve the new app
SO THAT everyone gets the new app at the address they already know

## Acceptance Criteria

- DNS points at Cloudflare and the app is served over HTTPS at ashlanddailyhelp.com.
- Old URLs redirect: `?view=`, `?resource=`, `?category=`, `?q=` and `?list=` land on the matching new pages.
- Returning visitors' old service worker is replaced and its `hub-preview-*` caches are cleared.
- The old static files (`data.js`, `core.js`, `app.js`, the CSS files, `sw.js`, `build.json`) are removed from this repo, after `1-request-steward-decoupling` lands.
- This repo's CLAUDE.md and README, and RogueRaise's `2026-10-unhoused/RESOURCES.md`, describe the new app.
- The steward's CORS allow-list and feed URL match the production setup.

## Notes

- Find out where the domain and current hosting live (the steward README mentions Bluehost).

## Implementation Plan

[to be filled in by /stories plan]
