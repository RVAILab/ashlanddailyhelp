<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:01:24-07:00
  planned_at:   2026-10-25T15:04:53-07:00
  finished_at:  2026-10-25T15:09:44-07:00
  updated_at:   2026-10-25T15:09:44-07:00
-->

# Story: Printable Handout

## Summary

AS a navigator, librarian or volunteer
I WANT to print a clean one-page sheet of resources
SO THAT someone without a phone can take the information with them

## Acceptance Criteria

- Print a list, a category or today's view as a one-page sheet: name, address, phone, hours, key requirements.
- Large type, black and white, no images, and an "as of" date plus a note to confirm before visiting.
- A QR code and short URL back to the same view.
- Prints in English or Spanish.

## Notes

None yet.

## Implementation Plan

A `/print` page (no JavaScript) for a list (`?ids=` or the saved list), a kind of help (`?category=`) or today (`?view=today`): a table of place (name, address, phone), when, and what to know, in large black-and-white print styles, with the "as of" date, a note to confirm before visiting, the help numbers, and a QR code (SVG made on the server with `qrcode-generator`) and address back to the same view. Linked from the list, search by kind of help and /today. Spanish prints with English placeholders until `29-spanish-pass`.

## Review

Reviewed 2026-10-25 at `a80c024` plus uncommitted fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| A list, a category or today's view as a one-page sheet | ⚠️ | `app/routes/print.tsx` loader. The sheet doesn't enforce one page; rows don't split across pages (`app.css`, `break-inside: avoid`). |
| Large type, black and white, no images, as-of date, confirm note | ✅ | `app/app.css` `@media print` and `@page`. `print.tsx` adds the note and the as-of date. |
| QR code and short URL back | ✅ | `app/lib/qr.ts` with a 4-module quiet zone, printed 1.5in wide. |
| English or Spanish | ⚠️ | Deferred to story 29. |

These findings were fixed:

- The today sheet printed every listing. It now uses `groupToday` and leaves off places closed for the day, including those shut by an alert.
- Fictional demonstration data wasn't labelled. The sheet now says so.
- "Schedule needs checking" and other warnings were dropped, and unknown values printed as-is. Rows now come from `listingDetail` and its labels.
- Offline, `/print?ids=` could fall back to this device's own saved sheet. The service worker no longer falls back for `/print`, the same rule as `/list`.
- The QR quiet zone was 2 modules and the code was about 1.1in. It is now 4 modules and 1.5in in print.

Not changed: a long list still runs to more than one page. Hours and requirements still print for sensitive listings, as they do on the listing page.

## Learnings

- **Went well:** building rows from `listingDetail` gave the sheet the same evidence wording as the listing page at no extra cost.
- **Surprising:** "today's view" means today's grouping, not today's listings. Reusing the page's query without its grouping quietly printed closed places.
- **Next time:** when a new view shows the same data as an existing page, start from that page's loader, alert handling included, rather than its underlying query.
