<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:15:10-07:00
  planned_at:   2026-10-25T14:15:36-07:00
  finished_at:
  updated_at:   2026-10-25T14:15:36-07:00
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
- Works offline from the last copy, labelled "as of". (With `15-offline-pwa`, which makes pages work offline.)

## Notes

- From `10-homepage`: add a link to /today on the homepage, above the kinds of help.
- Reuse `app/lib/listing-labels.ts` and `app/components/listing-status.tsx` from `07-browse-and-search`, so `/today` and `/resources` show the same evidence labels.
- Blocked by `02-request-structured-hours`.

## Implementation Plan

Built against the `openings` field proposed in steward #39, which isn't published yet: until it is, every listing lands in "Hours not confirmed", which is the honest answer. The consumer contract accepts `openings` as an optional extension and still applies the steward's strict schema to everything else.

### Steps

1. `server/feed/contract.ts`: accept optional `openings` (start, optional end, location, status, note) on listings, stored with the listing; the steward's own schema checks the rest.
2. `server/today/group.ts`: `groupToday(listings, now)`, pure: Open now, Later today, Closed today, Hours not confirmed, in Pacific time. No openings, `conflict` or `mayBeCanceled` never count as open; a canceled window doesn't either.
3. `app/routes/today.tsx` (`/today`): the four groups with headings and counts, each entry a listing card plus today's hours ("Open until 3:00 PM", "Opens at 1:00 PM"); category and area filters in the URL; "Worked out at 11:05 AM"; regrouping when the next window starts or ends.
4. Homepage: a "Open now and later today" link above the kinds of help.
5. Strings in English; Spanish copies are English placeholders until `27-spanish-pass`.

### Data model

None beyond the optional `openings` inside the stored listing.

### Tests

`group.test.ts` (each group, overnight windows, Pacific day boundaries, conflict and cancellations), contract tests (openings accepted, other unknown fields still dropped, steward checks still applied), route tests, and an end-to-end visit.
