<!--
metadata:
  created_at:   2026-10-25T14:14:35-07:00
  activated_at: 2026-10-25T16:50:28-07:00
  planned_at:   2026-10-25T16:50:45-07:00
  finished_at:
  updated_at:   2026-10-25T16:50:45-07:00
-->

# Story: Spanish Pass

## Summary

AS a Spanish speaker
I WANT every page and feature in good Spanish
SO THAT the whole site works for me, not only the parts built first

## Acceptance Criteria

- Every message in `app/i18n/es.ts` is real Spanish: no English placeholders left from stories built after Oct 25 (search the catalog for messages identical to `en.ts`).
- The Spanish wording notes from the reviews of stories 08, 09 and 10 are applied.
- Spanish search, translation labels and alerts work on every page added since story 11 (/today, events, alerts, lists, handouts, Pulse, chat).
- A native speaker reviews `app/i18n/es.ts` and a sample of machine translations.

## Notes

- Decided Oct 25: all Spanish work is deferred to the end of the backlog. Stories after 11 add their new strings to `es.ts` as English copies.

## Implementation Plan

Translate every English placeholder in `app/i18n/es.ts`, using the conventions already set: formal "usted", plain everyday words, Mexican Spanish ("regadera"), and the glossary in `server/translate/claude.ts`. Add a test that keeps the catalog from drifting back to English. Then walk the Spanish pages added since story 11.

1. **`app/i18n/es.ts`.** Real Spanish for the 182 messages identical to `en.ts`, except proper names that stay as they are (Daily Help, Ashland, Oregon). Keep "Community Pulse" as the page's name with a Spanish description. Spanish words in units ("comidas", "sesiones", "atenciones") and in "mi" and "min" distances ("a unos 8 minutos a pie").
2. **`app/i18n/catalog.test.ts`.** A test that no Spanish message equals its English one, except a short list of names that are the same in both.
3. **Story 10's notes.** They were never recorded in detail, so review the homepage strings in this pass: the hero, the ways in, and the emergency labels (the crisis line's name in Spanish).
4. **Spanish pages since story 11.** Check that each shows Spanish chrome, translated or English-marked listing text, and Spanish dates:
   - `/es/today` and `/es/next`;
   - `/es/list` and `/es/print`;
   - `/es/pulse`, `/es/ask` and `/es/navigator`.

   e2e: `/es/today` and `/es/ask` show Spanish headings and the Spanish crisis numbers block.
5. **Native review.** A person's task, recorded as open: a native speaker reviews `es.ts` and a sample of machine translations.

Tests:

- The catalog test above.
- The existing Spanish tests, updated for the new wording.
- An e2e Spanish journey.

