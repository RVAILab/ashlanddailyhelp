<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:32:53-07:00
  planned_at:   2026-10-25T12:32:53-07:00
  finished_at:
  updated_at:   2026-10-25T12:32:53-07:00
-->

# Story: Browse and Search Resources

## Summary

AS someone looking for help, or a navigator
I WANT to browse by category and area and to search by words
SO THAT I can find a specific kind of help

## Acceptance Criteria

- Browse by category and by area (Ashland, county-wide, and other towns the feed names).
- Text search over name, provider, description and tags, in English and Spanish, served from Postgres full-text search.
- The query and filters are in the URL, shareable, and restored with back and forward.
- Results use the same status labels as /today.
- No results: suggest removing filters, and show 211.
- Moved in planning to `15-offline-pwa`, which caches the listings on the device: offline, search runs on the device over the cached listings.

## Notes

- Search by distance is `22-find-help-nearby`.

## Implementation Plan

A `/resources` page rendered on the server: a plain GET form (words, category, area) whose values live in the query string, so links are shareable and back and forward work without JavaScript. The loader filters and ranks in Postgres with full-text search. Each result shows the listing's evidence labels through one shared component, which `/today` will reuse.

### Steps

1. Migration: a generated `search` `tsvector` column on `listings` over name, provider, description and tags (name, then provider, then description and tags), with a GIN index. Filtering by category and area uses `jsonb` operators on `data` directly, so no array columns are needed. (Changed in review: a second, unstemmed `words` column for part-words and common words.)
2. `server/listings/search.ts`: `searchListings(db, { query, category, area }, now)` returns current listings (not past `endsAt`) in feed order, or by rank when there are words; words become prefix terms (`show` finds "showers"), and punctuation can't break the query. `listingAreas(db)` gives the places the feed names, Ashland first, then county-wide, then the rest.
3. `app/components/listing-status.tsx`: the evidence labels, each with a word and a shape: "Schedule needs checking" (`conflict`), "Not yet confirmed by provider" (`unconfirmed`), the `mayBeCanceled` note as written, "Ends …" (`endsAt`), "Last confirmed …" (`lastConfirmed`), and the `provenanceLabel` or "Source reviewed · Oct 23".
4. `app/components/listing-card.tsx`: name, provider, categories, area, the prose schedule, address, a tap-to-call phone, and the status labels.
5. `app/routes/resources.tsx`: the form (labelled fields, a search button), a result count announced politely, the cards, and the empty state: suggest removing filters (a link that clears them) and show 211.
6. A link to `/resources` from the placeholder homepage, until `10-homepage`.

### Data model

Generated columns on `listings`: `search` (stemmed English) and `words` (unstemmed), both `tsvector` with GIN indexes. No change to ingest: Postgres keeps them in step with `data`.

### Tests

- `server/listings/search.test.ts` (PGlite, the sample feed): every current listing without filters, in feed order; a category; an area, including county-wide coverage; words matching name, provider, description and tags; prefix matching; words ranking a name match first; punctuation and empty words; listings past `endsAt` left out; `listingAreas` order.
- `app/components/listing-status.test.tsx`: each label's word, and nothing for fields that are absent.
- `app/routes/resources.test.tsx`: the form shows the current filters; results; the empty state with 211 and a clear-filters link.
- `e2e/resources.spec.ts`: search for "shower" from the homepage, filter by category, then back restores the earlier results.

### States and accessibility

- Empty (no results), no feed yet (say listings haven't loaded), and a database error (the route's error boundary, with 211).
- Labels on every field, a visible focus style, 44px targets, the result count in a polite live region, headings per card, and `tel:` links with the number as text.

### Risks and open questions

- Search in Spanish needs Spanish text, which arrives with `11-translate-listings`; until then Spanish words only match where the English text shares them. That story adds the translations to the search column.
- Offline search moves to `15-offline-pwa`, as noted in the criteria.
