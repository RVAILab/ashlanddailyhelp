<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Community Pulse

## Summary

AS a funder, city or county staff member, or member of the public
I WANT to see how scheduled services went each week (amounts served, unmet need)
SO THAT I understand what the community is providing and where help falls short

## Acceptance Criteria

- A Pulse page built on `pulse.json` for the live week and the frozen `weeks/` files for published weeks, newest first, with correction notes.
- Units are never added together; unknown is never shown as zero; canceled and unknown outcomes never carry an amount.
- A single provider's daily figure under 10 shows as "fewer than 10"; youth-serving providers' single-provider counts never show.
- Fictional data is labelled as fictional everywhere, including any CSV export.
- Every chart state carries a shape and a word; bars use a labelled linear scale from zero.
- The live week is labelled "This week so far. Numbers can change until the week is published."

## Notes

- Decided Oct 25: later, not v1.
- Rules: steward `docs/FEED.md` (`pulse.json` and week files) and `docs/CONTEXT.md` decision 14.

## Implementation Plan

[to be filled in by /stories plan]
