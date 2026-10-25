<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:21:20-07:00
  planned_at:   2026-10-25T14:21:41-07:00
  finished_at:
  updated_at:   2026-10-25T14:21:41-07:00
-->

# Story: Today: Scheduled Events

## Summary

AS someone looking for help
I WANT /today to show today's and the coming week's scheduled events
SO THAT I don't miss one-off help like a pop-up clinic or a clothing giveaway

## Acceptance Criteria

- Today's events in time order, with finished ones collapsed, then "Tomorrow" and "This week".
- Each shows time, title, provider, location and status. Canceled events stay listed and are clearly marked; "may be canceled" shows its note.
- Links to the related listing when there is one.
- With no events: "No scheduled events today", never sample data.
- Works offline from the last copy, labelled "as of". (With `15-offline-pwa`.)

## Notes

- Blocked by `03-request-events-feed`.

## Implementation Plan

Ingest the proposed `events.json` (steward #40) like `listings.json`, and show it on `/today` under "Scheduled events": today (finished ones collapsed), tomorrow, and the rest of the week. Until the steward publishes the file, a 404 is recorded quietly as "not published yet" and the section says there are no scheduled events.

### Steps

1. `server/feed/contract.ts`: `EventsFile` in the shape proposed in #40 (lenient: unknown fields dropped).
2. `db/schema.ts`: an `events` table (id, position, local date, start and end, the event as `jsonb`); `server/feed/events.ts`: the spec, and `upcomingEvents(db, now)`, leaving out events that have ended.
3. `refreshFeedFile`: a spec can be optional, so a 404 is "not published yet" without an error log; `runIngest` refreshes listings, then events.
4. `server/today/events.ts`: `groupEvents(events, now)` into today, finished today, tomorrow, later this week, in Pacific time.
5. `/today`: the events section, each with time, title, provider, location, status (canceled stays, marked; may-be-canceled shows its note) and a link to the related listing.

### Tests

Contract, ingest (stored, 404 quiet), grouping (day boundaries, finished, canceled, date-only), the page, and the empty state.
