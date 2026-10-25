<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:35:21-07:00
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
- Offline, search runs on the device over the cached listings.

## Notes

- Search by distance is `23-find-help-nearby`.

## Implementation Plan

[to be filled in by /stories plan]
