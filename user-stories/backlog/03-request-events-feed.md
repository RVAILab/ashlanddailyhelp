<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:35:21-07:00
-->

# Story: Request an Events Feed from the Steward

## Summary

AS the front-end team
I WANT a feed of upcoming dated happenings (pop-up clinics, giveaways, mobile showers, meals)
SO THAT /today can show scheduled events

## Acceptance Criteria

- A proposed new feed file (for example `events.json`) with, for each occurrence: a stable id, title, provider, the listing id when it belongs to one, start and end date-times with offset, location (or "Location not published. Call the provider."), categories, cost and requirements text, source URL and provenance, and a status (scheduled, may be canceled with its note, canceled).
- It covers at least today through the next seven days.
- The same fetch rules as `listings.json`: `schemaVersion`, `generatedAt`, `dataset`, ETag, no half-written files.
- It is clearly separate from `pulse.json` `events`, which are counted service occurrences.
- The steward's owner has accepted or amended the proposal.

## Notes

- Blocks `14-today-events`.

## Implementation Plan

[to be filled in by /stories plan]
