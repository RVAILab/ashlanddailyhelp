<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T13:15:37-07:00
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
- A Spanish speaker spot-checks the translations before launch, and readers can report a bad one.

## Notes

- From `09-resource-detail`: on the listing page in Spanish, translated text is labelled as an automatic translation with a link to the English.
- From `07-browse-and-search`: searching in Spanish needs the translated text in the search. Translations live in their own table (keyed by a hash of the English), which a generated column on `listings` can't read, so search will match against a Spanish `tsvector` kept on the translations table (or rebuilt into a listings column when translations are stored) and `searchListings` will query both. Accent-insensitive matching (`unaccent`, wrapped as an immutable function) belongs here too.
- Decided Oct 25: this app translates; the steward sends English.
- Use Claude with an API key held as a Cloudflare secret.
- Risk: a mistranslated requirement (for example "ID required") misleads. Consider a glossary of fixed terms.

## Implementation Plan

[to be filled in by /stories plan]
