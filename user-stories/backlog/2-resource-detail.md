<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
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
- In Spanish, translated text is labelled as an automatic translation with a link to the English.
- Links to "Report a problem with this listing" (`3-provider-listing-view`).

## Notes

- Listing copy follows the content rules: say only what the provider's own source states ("Website lists…", "Confirm before visiting").

## Implementation Plan

[to be filled in by /stories plan]
