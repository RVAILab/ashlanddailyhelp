<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:12:31-07:00
  planned_at:   2026-10-25T12:12:31-07:00
  finished_at:
  updated_at:   2026-10-25T12:13:48-07:00
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
