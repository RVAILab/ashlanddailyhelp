<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:28:18-07:00
  planned_at:   2026-10-25T15:28:44-07:00
  finished_at:  2026-10-25T15:38:14-07:00
  updated_at:   2026-10-25T15:38:14-07:00
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


## Review

Reviewed 2026-10-25 at `be8d473` plus uncommitted fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| A switch on every page turns off images, web fonts and decoration, remembered on the device | ✅ | The footer link (`app/components/feed-footer.tsx`) goes to `/text`, which sets a one-year cookie (`app/routes/text.ts`). `.text-only` in `app/app.css` swaps in system fonts and drops the decoration. The homepage leaves its art out. The e2e test sees no `/fonts/` or `/art/` requests. |
| Save-Data turns it on by default | ✅ | `app/lib/text-mode.ts`, and the e2e test "with Save-Data" |
| Every feature still works | ✅ | e2e: search and the saved list in text-only mode |

These findings were fixed:

- The service worker keeps saved pages whatever their mode, so after a switch an offline copy could come back in the old mode, and `/text` offline showed the browser's own error. The worker now forgets saved pages when the mode switches, and the page saves them again in the new mode. Offline, the switch shows the app's offline page. There is an e2e test for this.
- There was no test that the saved list works in text-only mode. One is added.

Not changed: going Back can show a page from the browser's back-forward cache in the old mode until it reloads.

## Learnings

- **Went well:** having every `font-family` go through `--serif`/`--sans` turned "no web fonts" into two token overrides, with nothing to hunt for.
- **Surprising:** a cookie that changes how pages look interacts with the offline cache, which ignores Vary. Anything in a saved page that depends on a cookie needs the cache cleared when that cookie changes.
- **Next time:** for any new cookie that shapes pages, ask what the service worker has already saved.
