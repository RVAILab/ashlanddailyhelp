<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
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

- Decided Oct 25: this app translates; the steward sends English.
- Use Claude with an API key held as a Cloudflare secret.
- Risk: a mistranslated requirement (for example "ID required") misleads. Consider a glossary of fixed terms.

## Implementation Plan

[to be filled in by /stories plan]
