<!--
metadata:
  created_at:   2026-10-25T14:14:35-07:00
  activated_at: 2026-10-25T16:50:28-07:00
  planned_at:   2026-10-25T16:50:45-07:00
  finished_at:  2026-10-25T20:52:34-07:00
  updated_at:   2026-10-25T20:52:34-07:00
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


## Review

Reviewed 2026-10-25 at `77f38e6` plus fixes. A subagent did an independent read, as a Mexican-Spanish copy editor.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Every message in `es.ts` is real Spanish; no English placeholders | ✅ | `app/i18n/catalog.test.ts` fails on any Spanish message identical to its English one, except a short list of names. |
| The Spanish wording notes from stories 08, 09 and 10 applied | ✅ | Notes from 08 and 09 were applied at the time. Story 10's were never written down, so the homepage was re-read in this pass and corrected ("adonde", the eyebrow, the crisis line's name). |
| Spanish search, translation labels and alerts work on pages since story 11 | ✅ | e2e: `/es/today`, `/es/next`, `/es/list`, `/es/pulse`, `/es/ask` and `/es/navigator` show Spanish chrome, and a Spanish crisis question gets the Spanish crisis numbers first. Times and dates follow Spanish grammar (`app/i18n/spanish-times.test.ts`). |
| A native speaker reviews `es.ts` and a sample of machine translations | ❌ | Open: a task for a person before launch. |

These findings were fixed:

- **Times built from parts were ungrammatical, and one was misleading.** "Del mañana" could read as "in the morning". Now:
  - "a la 1:00" versus "a las 5:00";
  - "hasta las 2:00";
  - "mañana a las 9:00";
  - "el martes a las 5:00";
  - "las 7:30 a.m. de mañana";
  - "Calculado el domingo, 25 de octubre a las…".
- **Dates.** Alerts use full day names in Spanish ("Del martes, 7:00 p.m. al…"), and Pulse weeks read "Semana del 19 de octubre".
- **Plainer wording.**
  - The unknown answer no longer repeats "para".
  - "eventos que ya terminaron hoy".
  - "Nadie informó que faltara ayuda".
  - "Guardar estos lugares en mi lista".
  - One word, "dispositivo", for the device.
- **Crisis numbers.** The Spanish crisis text, the SMS HELP reply and the handout say "988 (marque 2 para español)".

## Learnings

- **Went well:** the drift test turns "no English left" into something CI keeps true, not a one-time sweep.
- **Surprising:** most errors weren't in any single message but in messages put together from parts. "del" plus "mañana", and "las" plus "1:00", only show up once the code's real values are passed in.
- **Next time:** for every message that takes a time, a day or a count, test it with the real values the code passes, in each language.
