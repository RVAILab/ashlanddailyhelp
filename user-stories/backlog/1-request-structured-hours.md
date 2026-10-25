<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
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

- Blocks `2-today-open-now`.
- The steward already harvests provider pages and ICS feeds. Steward owner: Thor.

## Implementation Plan

[to be filled in by /stories plan]
