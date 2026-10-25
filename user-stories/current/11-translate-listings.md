<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:01:03-07:00
  planned_at:   2026-10-25T14:01:03-07:00
  finished_at:
  updated_at:   2026-10-25T14:01:03-07:00
-->

# Story: Machine-Translate Listing Text

## Summary

AS a Spanish speaker
I WANT listing, event and alert text in Spanish
SO THAT I understand what a service offers and what it requires

## Acceptance Criteria

- On ingest, prose fields (description, access, requirements, cost, accessibility, capacity, the prose schedule, event and alert text) are machine-translated and stored in Postgres, keyed by a hash of the English text. Unchanged text is never re-translated.
- Names, addresses, phone numbers, URLs and structured times are never translated.
- Spanish pages label translated text "Traducción automática" and link to the English.
- If a translation is pending or failed, the English shows, marked as English.
- Translation spend is bounded (only new or changed text) and logged.
- A Spanish speaker spot-checks the translations before launch, and readers can report a bad one. (Reporting moves to `16-provider-listing-view`, which builds the report page; the spot-check is a launch task for a person.)

## Notes

- From `09-resource-detail`: on the listing page in Spanish, translated text is labelled as an automatic translation with a link to the English.
- From `07-browse-and-search`: searching in Spanish needs the translated text in the search. Translations live in their own table (keyed by a hash of the English), which a generated column on `listings` can't read, so search will match against a Spanish `tsvector` kept on the translations table (or rebuilt into a listings column when translations are stored) and `searchListings` will query both. Accent-insensitive matching (`unaccent`, wrapped as an immutable function) belongs here too.
- Decided Oct 25: this app translates; the steward sends English.
- Use Claude with an API key held as a Cloudflare secret.
- Risk: a mistranslated requirement (for example "ID required") misleads. Consider a glossary of fixed terms.

## Implementation Plan

After each listings refresh, the scheduled Worker translates any English prose it hasn't translated before into Spanish with Claude, and stores each translation keyed by a hash of its English text, so unchanged text is never sent again. Spanish pages swap in the stored translation, label it "Traducción automática" with a link to the English, and fall back to the English (marked as English) when there is none yet. A Spanish search column, rebuilt from the translations, lets Spanish words find listings.

### Steps

1. `db/schema.ts` and a migration: `translations` (`hash` primary key over language and English text, `lang`, `english`, `text`, `model`, `translated_at`), and a `search_es` `tsvector` column on `listings`, set by the app (not generated, since it reads another table).
2. `server/translate/texts.ts`: the prose fields of a listing that get translated (description, schedule, access, requirements, cost, accessibility, capacity, the `mayBeCanceled` note), never names, addresses, phones, URLs or times on their own; and `hashText(lang, english)`.
3. `server/translate/claude.ts`: one request per batch to `claude-opus-5-5` (low effort; `fallbacks: "default"` so a declined request is retried on another model), with a fixed system prompt (cached), a glossary of terms that must translate consistently ("ID required", "walk-in", "appointment"), and structured JSON output checked with zod; a refusal, a malformed answer or an API error fails that batch only.
4. `server/translate/run.ts`: `translatePending(db, translator, { maxTexts })`: finds current listings' texts with no stored translation, sends at most `maxTexts` per run in batches, stores what comes back, rebuilds `search_es` for listings whose texts changed, and logs counts and token usage. Runs after ingest in the scheduled handler when `ANTHROPIC_API_KEY` is set.
5. `server/translate/lookup.ts`: `translationsFor(db, texts, lang)` for loaders.
6. Pages: the `/resources` and listing loaders replace feed text with stored Spanish on `/es` pages and mark it translated; cards and the listing page show "Traducción automática · Ver en inglés" linking to the English listing; untranslated text stays English with `lang="en"`.
7. `searchListings` with `lang: 'es'` also matches `search_es`; Spanish words and the query are compared without accents.
8. README: the API key secret, the per-run limit, and that a Spanish speaker should spot-check before launch.

### Data model

- `translations`: `hash` (text, primary key), `lang`, `english`, `text`, `model`, `translated_at`.
- `listings.search_es`: `tsvector`, nullable, GIN index.

### Tests

- `server/translate/texts.test.ts`: which fields are collected; names, addresses and phones never are; hashing is stable and per language.
- `server/translate/run.test.ts` (PGlite, a fake translator): translates only new text; never re-sends stored text; respects `maxTexts`; a failed batch stores nothing for it and the rest still lands; `search_es` is rebuilt; usage is logged.
- `server/translate/claude.test.ts`: builds the request (model, effort, fallbacks, cached system prompt, schema) and parses answers, rejecting a refusal, a wrong count or a mismatched id, with the SDK client faked.
- `server/listings/search.test.ts`: a Spanish word finds a listing through its translation, accents ignored.
- Route tests: `/es/resources` and `/es/resources/<id>` show the Spanish text with the label and link, and English with `lang="en"` when no translation exists.

### Risks and open questions

- A mistranslated requirement misleads; the glossary, the "translate only, add nothing" instruction and the visible label and link to the English reduce that, and a Spanish speaker should spot-check before launch.
- Cost: bounded per run by `maxTexts` (default 200) and paid once per distinct text; the log shows tokens per run.
