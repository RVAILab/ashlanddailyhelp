<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:10:29-07:00
  planned_at:   2026-10-25T12:10:44-07:00
  finished_at:
  updated_at:   2026-10-25T12:10:44-07:00
-->

# Story: Request Structured Hours from the Steward

## Summary

AS the front-end team
I WANT the steward's listings to carry machine-readable opening hours next to the prose `schedule`
SO THAT /today can work out what is open now and next

## Acceptance Criteria

- A proposed contract change on RVAILab/daily-help-steward: weekly recurring hours per listing (day, open, close, in America/Los_Angeles), dated exceptions (closed, holiday hours), and a way to say "hours unknown" that is distinct from "closed".
- The prose `schedule` stays as the readable text, and `conflict` still flags sources that disagree.
- Each structured value carries provenance like other fields.
- It is an optional field and a minor version bump, so older consumers ignore it.
- The steward's owner has accepted or amended the proposal.

## Notes

- Blocks `12-today-open-now`.
- The steward already harvests provider pages and ICS feeds. Steward owner: Thor.

## Implementation Plan

File the request as an issue on RVAILab/daily-help-steward, built on what the steward already has: its `Schedule` model (`src/schedule/index.ts`, from steward #9) and `schedules` table, which the packet and alert handlers already fill. Publishing that model as an optional `hours` field is a smaller ask than a new format, and keeps one schedule model across both repos.

### Steps

1. Read the steward's `Schedule`, `generateOccurrences` and the `schedules` table, so the proposal matches what exists.
2. File the issue: the field (`hours`: the steward's `Schedule` plus `timeZone`), what absent means ("hours not confirmed", never "closed"), how it relates to the prose `schedule` and `conflict`, provenance under `provenance.hours`, feed 1.4 as a minor bump, and a sample-feed listing with split hours and an overnight window.
3. Link the issue from this story.

### Data model

None in this repo. The site's reading of `hours` is built in `12-today-open-now`, against the proposed shape.

### Tests

None: this story produces a request, not code.

### Risks and open questions

- The steward's owner may change the shape; `12-today-open-now` follows whatever is agreed.
- "Accepted by the steward's owner" can't be closed from here; it stays open on the issue.
