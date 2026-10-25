<!--
metadata:
  created_at:   2026-10-25T14:38:18-07:00
  activated_at: 2026-10-25T15:05:29-07:00
  planned_at:
  finished_at:
  updated_at:   2026-10-25T15:05:29-07:00
-->

# Story: Bring Back the Legacy Look and Feel

## Summary

AS someone using Daily Help
I WANT the new app to look and feel like the original Rogue Raise site
SO THAT it is warm, recognisable and easy to read, not a plain prototype

## Acceptance Criteria

- The new app uses the legacy site's design: its fonts (the self-hosted Fraunces and Instrument Sans in `legacy/fonts/`), colour tokens, spacing, type scale, cards, buttons and chrome, in light and dark modes, taken from `legacy/experience.css`, `legacy/styles.css` and the per-view stylesheets.
- The homepage and the main pages recognisably match their legacy counterparts (hero, category entries, listing cards, footer), without bringing back features this app doesn't have.
- The legacy art (`legacy/art/`) is used where it fits, as progressive enhancement: AVIF/WebP with fallbacks, responsive sizes, nothing for Save-Data or text-only, and the homepage stays within its weight budget without images.
- Motion follows the legacy rules: only with `prefers-reduced-motion: no-preference` and not under Save-Data.
- Accessibility stays as it is now: contrast of 4.5:1 for text and 3:1 for controls in both themes, 44px targets, visible focus, every status a word and a shape.
- The fonts' licence (SIL OFL) is kept with them.

## Notes

- Requested Oct 25: reproduce the look and feel of `legacy/`.
- The legacy site is still served at https://ashlanddailyhelp.kitchenlab.workers.dev for side-by-side comparison.

## Implementation Plan

[to be filled in by /stories plan]
