<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T13:15:37-07:00
  planned_at:   2026-10-25T13:15:37-07:00
  finished_at:  2026-10-25T13:55:34-07:00
  updated_at:   2026-10-25T13:55:34-07:00
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

## Review

Reviewed 2026-10-25 at `427af8b` by an independent agent; findings checked and fixed in `31ad3cb` unless noted.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| A stable, shareable URL per listing id | ✅ | `resources/:id` under the `es?` segment; cards link to it in the page's language |
| Every field; "Not confirmed" for unknowns | ✅ | `app/lib/listing-detail.ts`; empty values and the steward's "Unknown" become "Not confirmed" in the page's language (steward #45 asks for empty values). Structured hours wait for `12-today-open-now`. |
| Evidence: provenance label, review or last-confirmed date, conflict, source links | ✅ | Labels from `listingLabels`; sources (web addresses only) named by site and page; the review date shown once |
| "Where does this come from?" | ✅ | A `<details>` disclosure from `provenance`, in the details' order, with the source, quoted text and date seen |
| Sensitive location: the steward's wording, no map | ✅ | Matched loosely; no map; the address's provenance dropped (tested). Steward #45 asks for a flag instead of matching wording. |
| Automatic-translation label | ⚠️ | Moved to `11-translate-listings`, recorded there |
| "Report a problem" link | ⚠️ | Moved to `16-provider-listing-view`, recorded there |

Findings:

1. Fixed: no tests guarded the safety branches. Tests now show `javascript:`, `data:` and other non-web addresses never become links, and a sensitive location's address provenance never appears.
2. Fixed: the steward's "Unknown" slipped past "Not confirmed", and an empty description showed nothing; raised with the steward as #45.
3. Fixed: the disclosure lost its marker (a flex `summary`); it now keeps the browser's marker, scoped to the listing page.
4. Fixed: "Back to search" dropped the search; cards now pass it along.
5. Fixed: two sources on one site had the same link text; they are named by site and page.
6. Fixed: provenance keys could collide, fields with no sources showed an empty term, unknown field names weren't marked English, and the order didn't follow the details.
7. Fixed: the review date appeared twice when there was no provenance label.
8. Fixed: any text with a digit was mapped; now only a street address (a number followed by a street name), from where it starts.
9. Fixed: field labels were typed loosely and the phone label was unused.
10. Kept: the not-found wording says "This listing is not available" (it may have ended) rather than the generic not-found page, with a link back to search; the plan's wording was the less useful one.
11. Fixed: the loader test covers an ended listing; the source link test uses a literal name. Left: the sample-feed helper returns an untyped value, so hand-made test listings aren't checked against the contract.
12. Fixed: the map link says it opens Google Maps in a new tab, the phone link says "Call …", focus moves to the new page's heading after an in-app navigation, non-web references are marked English on Spanish pages, and the provenance list has no wide indent. Left: inline source and provenance links are text-sized, which WCAG allows for links in text.
13. Fixed: Spanish wording ("Descripción", "Zonas que atiende", "Consultado el", "Guía de recursos del condado", "Equipo de Daily Help").

## Learnings

- Went well: building the page from a server-side view model kept every safety rule (sensitive locations, link schemes) in one tested function.
- Surprising: zod's `z.url()` accepts `javascript:` URLs, so a contract-valid feed can still carry an unsafe link; and the steward's placeholders ("Unknown") are data, not absence.
- Next time: treat every URL from the feed as untrusted at the point it becomes an `href`, and ask the steward for flags rather than matching its wording.
