<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:01:24-07:00
  planned_at:   2026-10-25T15:04:53-07:00
  finished_at:
  updated_at:   2026-10-25T15:04:53-07:00
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
