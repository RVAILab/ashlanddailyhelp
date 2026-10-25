<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:28:18-07:00
  planned_at:   2026-10-25T15:28:44-07:00
  finished_at:
  updated_at:   2026-10-25T15:28:44-07:00
-->

# Story: Text-Only Mode

## Summary

AS someone on an old phone or a tight data plan
I WANT a light text-only version of the app
SO THAT pages load quickly and cheaply

## Acceptance Criteria

- A switch on every page turns off images, web fonts and decoration; it is remembered on the device.
- Save-Data turns it on by default.
- Every feature still works in text-only mode.

## Notes

- Suggested by the steward's team (steward `docs/CONTEXT.md`, "Small notes passed to the Daily Help team").

## Implementation Plan

A `text` cookie, set by a `/text` route the way `/language` sets `lang`, turns on text-only mode. Without the cookie, `Save-Data: on` turns it on. The locale layout works the mode out once. The root puts `text-only` on `<html>`, CSS swaps the web fonts for system fonts and drops decoration, and pages leave out images.

1. **`app/lib/text-mode.ts`.** `textOnly(headers)`: `text=on` means yes, `text=off` means no, and otherwise yes only when `Save-Data` is `on`.
2. **`app/routes/text.ts`** (top level, `/text?to=on|off&return=`). It sets `text` for a year and sends the visitor back to the same page through `localReturn`. Add it to the service worker's `NEVER` list.
3. **`app/routes/locale.tsx`.**
   - The loader returns `text`.
   - Vary is `Accept-Language, Cookie, Save-Data` for English and `Cookie, Save-Data` for /es.
   - `app/root.tsx` adds `className="text-only"` to `<html>` from the locale data.
4. **`app/components/feed-footer.tsx`.** A "Text-only version" or "Full version" link on every page (`rel="nofollow"`), at least 44px tall.
5. **`app/routes/home.tsx`.** Art comes from `!textOnly(...)`, and the home `headers` export goes, since the layout varies on Save-Data now.
6. **`app/app.css`.** Under `.text-only`:
   - `--serif` and `--sans` become system stacks, so no web font downloads;
   - no shadows, masks, backdrop blur, brand mark or animation;
   - `.home-motion` is never set in text-only mode.

Data model: none.

Tests:

- `text-mode.test.ts`: the cookie beats Save-Data.
- `text.test.ts`: the cookie, the return path, and refusing other sites.
- Home loader tests: art follows the cookie.
- Footer view test: the switch link and its wording.
- e2e:
  - with the cookie, the homepage loads no `/fonts/` or `/art/` requests;
  - search and the list still work.

