<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:12:31-07:00
  planned_at:   2026-10-25T12:12:31-07:00
  finished_at:  2026-10-25T12:16:59-07:00
  updated_at:   2026-10-25T12:16:59-07:00
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

- Filed as [RVAILab/daily-help-steward#40](https://github.com/RVAILab/daily-help-steward/issues/40) on 2026-10-25.
- Blocks `13-today-events`.

## Implementation Plan

File the request as an issue on RVAILab/daily-help-steward for a new `events.json` feed file, generated from what the steward already has: `generateOccurrences` over each listing's `Schedule` (`src/schedule/index.ts`) for recurring services, plus dated one-off happenings such as shelter activations. Use the same conventions as the structured-hours request (steward #39), so the two read as one design.

### Steps

1. Draft the file's shape: header fields as for every feed file; `from`/`until` local dates (at least 14 days); per event a stable id, `listingId` or null, `kind` (`recurring` or `one_off`), title, provider, categories, local `date`, `startsAt`/`endsAt` with offset (absent when the source prints none), location (or the sensitive-location text), `status` (`scheduled`, `may_be_canceled`, `canceled`) with `note`, `conditions`, `source` and optional `provenance`.
2. Say how it differs from `pulse.json`'s `events` (counted occurrences), that canceled events stay until they would have ended, and that count-only schedules produce none.
3. File the issue and link it from this story.

### Data model

None in this repo; `13-today-events` builds against the proposed shape.

### Tests

None: this story produces a request, not code.

### Risks and open questions

- Settled while filing: recurring windows are listing `openings` with a per-window `status` (#39), so `events.json` holds only one-off events.
- "Accepted by the steward's owner" stays open on the issue.

## Review

Reviewed 2026-10-25 at `caac794` by an independent agent against #40, #39 and the steward's code (`src/contract/feed.ts`, `src/feed/build.ts`, `src/feed/writer.ts`, `src/agents/alert.ts`). Issue #40 was rewritten, and #39 amended, the same day.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Fields for each occurrence | ✅ | #40 fields; recurring windows are #39 `openings` with per-window `status`. End times optional, date-only events allowed. |
| Today through the next 7 days | ✅ | "at least 14 days from today" |
| Same fetch rules as `listings.json` | ✅ | Same header, validated with the other files, atomic, ETag, cached offline like `listings.json`. |
| Separate from `pulse.json` `events` | ✅ | Stated, including separate id spaces. |
| Accepted by the steward's owner | ❌ | Open on #40. |

Findings, all addressed:

1. Flyer events had no evidence labels. Events now carry `provenanceLabel`, `unconfirmed`, `conflict`, `lastConfirmed` and `provenance`.
2. Sensitive locations: #40 now applies the listings rule by provider and keeps the place out of every text field; #39 got the same rule for opening locations and schedule text.
3. The same occurrence could appear in #39 and #40. Now: a listing's own dates are always `openings`; shelter activations are listings plus alerts, not events; events never repeat a listing's openings.
4. Multi-day events: one entry per occurrence, with an optional `seriesId`.
5. Expiry and offsets: consumers hide an event after `endsAt` or its local date; times use the Pacific offset; the local `date` is back.
6. Ids survive a reschedule or cancellation and are never reused.
7. #39 and #40 disagreed (release, status convention, explicit nulls, time zone). They now ship together as 1.4, both leave `status` out for scheduled, optional fields are left out rather than null, and the file states its `timeZone`.
8. Offline caching and validation across files are now specified.
9. `source` is optional, since flyers and email have no URL; `provenanceLabel` says where it came from.
10. Date-only events are kept.
11. Smaller points (no printed address, ordering, the shared `events` name, and the expectation that few events exist until the steward has a flyer or calendar harvester) are addressed.

## Learnings

- Went well: reviewing #40 against #39 surfaced design choices (where an extra date lives, how cancellations are marked) that would otherwise have shown up as duplicate cards on `/today`.
- Surprising: the steward has no flyer or calendar harvester yet, so `events.json` will be nearly empty at first; the shape matters more than the data for now.
- Next time: write related requests as one design with a "what goes where" section up front, rather than one at a time.
- Open: the steward's owner still has to accept or amend #40.
