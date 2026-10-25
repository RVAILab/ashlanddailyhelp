<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T13:15:37-07:00
  planned_at:   2026-10-25T13:15:37-07:00
  finished_at:
  updated_at:   2026-10-25T13:15:37-07:00
-->

# Story: Resource Detail Page

## Summary

AS someone looking for help
I WANT a page for each resource with everything known about it
SO THAT I can decide whether to go and how to get there

## Acceptance Criteria

- A stable, shareable URL per listing id.
- Shows every listing field: description, address with a map link, schedule (and structured hours when present), access, requirements, cost, tap-to-call phone, accessibility, capacity and coverage. Unknown fields say "Not confirmed".
- Evidence: the `provenanceLabel`, the review or `lastConfirmed` date ("Last confirmed Oct 23"), "Schedule needs checking" on `conflict`, and links to `source` and every `sourceUrls` entry.
- A "Where does this come from?" view lists each field's sources from `provenance`: the source, the quoted text and when it was seen.
- A sensitive location shows "Location not published. Call the provider." and no map.
- In Spanish, translated text is labelled as an automatic translation with a link to the English. (Moved in planning to `11-translate-listings`, which produces the translations.)
- Links to "Report a problem with this listing" (`16-provider-listing-view`). (Moved in planning to that story, which builds the page the link goes to.)

## Notes

- Listing copy follows the content rules: say only what the provider's own source states ("Website lists…", "Confirm before visiting").

## Implementation Plan

A page per listing at `/resources/<id>` (and `/es/resources/<id>`), rendered on the server from the stored feed copy. It shows every field in the steward's own words, the evidence labels from `/resources`, the sources, and a "Where does this come from?" section built from `provenance`. Cards on `/resources` link to it.

### Steps

1. `server/listings/listing.ts`: `findListing(db, id, now)` returns a current listing (not past `endsAt`) or nothing.
2. `app/lib/listing-detail.ts`: turns a listing into what the page shows, on the server: each field's text ("Not confirmed" when the feed gives nothing), whether the location is published (the steward's "Location not published. Call the provider." text), a map link otherwise, the evidence labels plus the review date, the source links (`source` first, then the other `sourceUrls`), and the provenance entries per field with their quoted text and the day they were seen.
3. `app/routes/resource.tsx`: the page. Name as `h1`, provider, labels, a definition list of fields, tap-to-call phone, the map link (not for a sensitive location), "Sources", and a `<details>` "Where does this come from?" with one entry per field. A listing that isn't there (or has ended) answers 404 with the not-found page's wording plus a link back to search.
4. `app/components/listing-card.tsx`: the card's name links to the listing page in the current language.
5. Catalog strings in English and Spanish.

### Data model

None.

### Tests

- `server/listings/listing.test.ts` (PGlite): found, unknown id, ended.
- `app/lib/listing-detail.test.ts`: "Not confirmed" for empty fields; the sensitive-location text gives no map link; the map link encodes the address; sources in order without duplicates; provenance entries with field labels, quoted text and dates in each language; nothing when `provenance` is absent.
- `app/routes/resource.test.tsx`: headings, fields, phone link, sources, the provenance section, and the Spanish page.
- `app/routes/resource-loader.test.ts`: 404 for an unknown or ended listing.
- `e2e/resources.spec.ts`: from a search, open a listing, then go back to the same results.

### States and accessibility

- Not found or ended (404 with a way back), a sensitive location (no map, the steward's wording), no provenance (say sources for each detail aren't recorded yet).
- One `h1`, `h2` per section, a native `<details>` disclosure, external links that say where they go, 44px targets for the phone and map links.

### Risks and open questions

- The sample feed has no `provenance` or `sourceUrls`, so those parts are covered by unit tests with hand-made listings until the steward's sample carries them.
- Structured hours appear here once `12-today-open-now` reads them from the feed.
