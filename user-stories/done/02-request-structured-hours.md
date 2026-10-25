<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:10:29-07:00
  planned_at:   2026-10-25T12:10:44-07:00
  finished_at:  2026-10-25T12:13:48-07:00
  updated_at:   2026-10-25T12:13:48-07:00
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

- Filed as [RVAILab/daily-help-steward#39](https://github.com/RVAILab/daily-help-steward/issues/39) on 2026-10-25.
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

## Review

Reviewed 2026-10-25 at `0acba85` by an independent agent against the issue and the steward's code (`src/schedule/index.ts`, `src/agents/packet.ts`, `src/agents/alert.ts`, the `schedules` table). The issue was rewritten the same day to address every finding.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Weekly hours, dated exceptions, "unknown" distinct from "closed" | ✅ | After the rewrite: `openings` and `hours` (weekly rules), `exclude` and an `include` that replaces a date's windows (holiday hours), "Absent `openings` means the hours are not known". |
| Prose `schedule` stays, `conflict` still flags disagreement | ✅ | "When `conflict` is true … the site does not say Open now" |
| Each structured value carries provenance | ⚠️ | `provenance.hours` and `provenance.openings`, one list per field; per-rule provenance was judged unnecessary for now and the issue says so. |
| Optional field and minor bump | ✅ | "feed 1.4, optional fields, minor bump" |
| Accepted by the steward's owner | ❌ | Open: needs the steward's owner on #39. |

Findings, all addressed in the rewritten issue:

1. Holiday hours couldn't be expressed (`exclude` drops a date's `include`; an `include` adds a window). Now proposes that an `include` replaces that date's rule windows.
2. The first draft said `hours` would be the schedule "as it is stored"; the table keeps only `text_as_printed` and `rules`. The issue now asks for the table to store the whole `Schedule`.
3. It said the alert handler fills `schedules`; only the packet handler does. Corrected, with the expectation that `hours` starts on packet listings.
4. It left out `ScheduleRule.location`, `stops` and `include[].location`. Now included.
5–8. Overnight windows, week-of-month rules, untimed windows, conditions, count-only and partial schedules were undefined for "open now". Each now has a stated rule.
9–10. Same-day overrides weren't tied in. `mayBeCanceled` now suppresses "Open now" like `conflict`, and each opening window can carry its own `status`.
11. Adopted: the steward publishes computed `openings` for the next 7 days, so the site never re-implements schedule rules or daylight saving.
12. Smaller points (an overnight example, which text to show, mapping provenance to `FeedProvenance`) are addressed.

## Learnings

- Went well: grounding the request in the steward's existing `Schedule` model made it a small ask, and the independent review read the steward's code closely enough to find that the model can't yet express holiday hours.
- Surprising: the first draft described what the steward stores from memory of one file, and was wrong about which handlers write schedules. Requests to another team need the same evidence standard as code.
- Next time: ask for the computed result (`openings`) as well as the rules from the start; it moves time-zone and rule logic to the one place that already has it tested.
- Open: the steward's owner still has to accept or amend #39. `12-today-open-now` builds against the proposal meanwhile.
