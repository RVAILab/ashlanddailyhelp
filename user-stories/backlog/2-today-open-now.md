<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Today: What's Open Now

## Summary

AS someone looking for help
I WANT /today to list services open now and later today, soonest first
SO THAT I know where I can go next

## Acceptance Criteria

- /today groups listings into "Open now", "Later today", "Closed today" and "Hours not confirmed", worked out in Pacific time from structured hours.
- Each entry shows name, category, today's hours, "closes at" or "opens at", address (or "Location not published. Call the provider.") and a tap-to-call phone.
- A listing without structured hours is never shown as open; it appears under "Hours not confirmed" with its prose schedule.
- Status labels from the feed: `conflict` shows "Schedule needs checking", `unconfirmed` shows "Not yet confirmed by provider", `mayBeCanceled` shows its note as written.
- Filter by category and area; filters live in the URL so a view can be shared.
- The page says what time it was worked out, and refreshes the grouping when the hour changes.
- Every status carries a word and a shape, not only a colour.
- Works offline from the last copy, labelled "as of".

## Notes

- Blocked by `1-request-structured-hours`.

## Implementation Plan

[to be filled in by /stories plan]
