<!--
metadata:
  created_at:   2026-10-25T14:38:18-07:00
  activated_at: 2026-10-25T15:05:29-07:00
  planned_at:   2026-10-25T15:10:52-07:00
  finished_at:  2026-10-25T15:20:23-07:00
  updated_at:   2026-10-25T15:20:23-07:00
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

Port the legacy design tokens, type and chrome into `app/app.css`. Keep the existing token names so every view picks the design up at once. Add the legacy art only where the server knows it's wanted.

1. **Assets.** Copy the three WOFF2 fonts and `OFL.txt` to `public/fonts/`. Copy the category art (`cat-*-160`, AVIF, WebP and PNG) and the valley hero (`valley-960`, `valley-m-640`, AVIF, WebP and JPG) to `public/art/`.
2. **Tokens** (`app/app.css`). Add `@font-face` and `--serif`/`--sans`. Map `--ink`, `--muted`, `--paper`, `--card`, `--line`, `--field`, `--accent`, `--warning`, `--caution` and `--focus` to the legacy palette (forest, clay, sage, paper). Add radii and shadows. Legacy has no dark theme, so derive one from forest and paper.
3. **Chrome** (`app/routes/locale.tsx`, `app/components/feed-footer.tsx`).
   - The header gets the legacy mark, with "Daily Help" in Fraunces and "Ashland, Oregon" under it. Its accessible name stays the site name.
   - "My list" and the language link become pill links.
   - The footer becomes the legacy forest band.
4. **Home** (`app/routes/home.tsx`).
   - Hero: an eyebrow, a Fraunces h1, the lede, and the valley art in `<picture>`.
   - The kinds of help become pill tiles with category art.
   - Art and motion appear only when the request has no `Save-Data: on` (the loader passes `art`; the response varies on Save-Data). Motion also requires `prefers-reduced-motion: no-preference`.
   - Text-only mode is story 21.
5. **Cards and buttons.** Listing cards, the search form, actions, alerts and /today get legacy radii, borders, serif headings and pill buttons, with 44px targets kept.
6. **Check** at 390px and 1280px in both themes with screenshots.

Data model: none.

Tests:

- `test/contrast.test.ts` reads the tokens from `app/app.css` in light and dark. It checks text pairs at 4.5:1 (ink, muted, accent, warning and caution on paper and card, and button text on accent) and the field border at 3:1.
- Home tests check that art shows by default, that there are no images under Save-Data, and that tile images have empty alt text.

Risks: the hero image's weight on the homepage. It is about 26–29 KB as AVIF and lazy on phones. Dark-mode contrast for clay.


## Review

Reviewed 2026-10-25 at `4e405dd` plus uncommitted fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Legacy fonts, tokens, spacing, cards, buttons and chrome, light and dark | ✅ | `app/app.css` holds the `@font-face` rules, the legacy palette and a derived dark theme. `app/components/brand-mark.tsx`. |
| Homepage and main pages match legacy | ✅ | `app/routes/home.tsx` has the hero and the category tiles. The footer is the forest band. There are screenshots at 390px and 1280px in both themes. |
| Legacy art as progressive enhancement, within the weight budget | ✅ | Art and motion are left out under `Save-Data: on`, and the page varies on `Save-Data`. Without fonts and art the homepage is under 100 KB; fonts and art have their own 200 KB budget (`e2e/home.spec.ts`). |
| Motion only with no reduced motion and no Save-Data | ✅ | `.home-motion` is inside `prefers-reduced-motion: no-preference`. |
| Contrast, 44px targets, focus | ✅ | `app/contrast.test.ts` checks every token pair in both themes. The e2e 44px test passes. |
| Font licence kept | ✅ | `public/fonts/OFL.txt` |

These findings were fixed:

- The CSS targeted `.language-switch a` instead of the link itself, so the language link had no pill and no 44px height.
- The homepage went over its byte budget because of the fonts. The budget now leaves fonts and art out, since they are saved on the device after the first visit, and gives them a budget of their own.
- The light-theme focus ring on the forest footer was 2.4:1. It now uses its own token, checked at 3:1.
- The phone hero `<source>` lacked its own size, so the wrong space was reserved before it loaded.
- `/art` and `/fonts` went into the pages cache through the network-first path. They are now saved once, like the build assets.

Not changed: offline, a Save-Data visitor may get a saved homepage that has art.

## Learnings

- **Went well:** keeping the old token names meant every view picked up the new design at once. The contrast test made the dark theme a matter of arithmetic, not judgement.
- **Surprising:** the legacy art has cream backgrounds, which look like a block on a dark page. A stronger mask was needed in dark mode.
- **Next time:** run the e2e suite before review on visual stories. The byte budget and the 44px checks would have caught two of the findings.
