<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:14:19-07:00
  planned_at:   2026-10-25T12:14:19-07:00
  finished_at:  2026-10-25T12:20:35-07:00
  updated_at:   2026-10-25T12:20:35-07:00
-->

# Story: Request an Alerts Feed from the Steward

## Summary

AS the front-end team
I WANT time-bound alerts (cold-weather shelter openings, closures, smoke or heat warnings, cancellations) in the feed
SO THAT /today and the homepage can show them before someone travels

## Acceptance Criteria

- A proposed feed file or field with, for each alert: id, kind, title, a plain message, start and end date-times, affected listing and event ids, area, severity, source and provenance.
- Expired alerts are not published (consumers also hide them after their end time).
- An agreed relationship to the existing listing fields `mayBeCanceled` and `endsAt` (for example a cold-weather shelter listing), so the same fact isn't shown twice or contradictorily.
- The steward's owner has accepted or amended the proposal.

## Notes

- Filed as [RVAILab/daily-help-steward#41](https://github.com/RVAILab/daily-help-steward/issues/41) on 2026-10-25, aligned with #39 and #40 (one 1.4 release).
- Blocks `14-today-alerts`.
- The steward already has a `city_alert` source type and a cold-weather fixture (`fixtures/alerts/cold-weather-2026-10-25.html`).

## Implementation Plan

File the request as an issue on RVAILab/daily-help-steward for a new `alerts.json` feed file, consistent with #39 (listing `openings` with per-window cancellations) and #40 (one-off `events.json`). The steward already turns a City of Ashland alert into a time-bound shelter listing (route 6, `src/agents/alert.ts`); an alert is the notice that points at it.

### Steps

1. Shape: the feed header; per alert an id, `kind`, `severity`, plain `title` and `message`, `startsAt`/`endsAt` with offset, `area`, the `listingIds` and `eventIds` it affects, `source` and optional `provenance`.
2. State how alerts relate to `mayBeCanceled`, `endsAt`, a window's `status` (#39) and events (#40), so the site never shows one fact twice or two contradicting facts.
3. File the issue and link it from this story.

### Data model

None in this repo; `14-today-alerts` builds against the proposed shape.

### Tests

None: this story produces a request, not code.

### Risks and open questions

- Whether a cancellation is an alert or only a window or event `status`. Proposed: a status by default, and an alert only when a coordinator wants it at the top of the page.
- "Accepted by the steward's owner" stays open on the issue.

## Review

Reviewed 2026-10-25 at `b881b83` by an independent agent against #41, #39, #40 and the steward's alert route (`src/agents/alert.ts`, `src/agents/source-routes.ts`, `src/feed/build.ts`, `src/feed/writer.ts`). Issue #41 was rewritten the same day.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Shape with id, kind, title, message, times, affected ids, area, severity, source, provenance | ✅ | #41 "Fields" |
| Expired alerts not published; consumers hide them | ✅ | Published from 48 hours before `startsAt` until `endsAt`; the site hides an alert after `endsAt`. |
| Agreed relationship to `mayBeCanceled` and `endsAt` | ⚠️ | Proposed in "How alerts relate to the other fields"; not yet agreed. |
| Accepted by the steward's owner | ❌ | Open on #41. |

Findings, all addressed:

1. A canceled shelter would keep its "open" banner: alerts had no status and route 6 ignores deactivation notices. Alerts now have `status` (`may_be_canceled`, `canceled`, `withdrawn`) that changes with the listing window's, and route 6 should handle deactivations.
2. A closure alert didn't stop "Open now". It now comes with the matching window or event status, and the site never shows "Open now" for a listing named by an in-effect closure.
3. Shelter alert and listing times could differ; they must now equal the window's, and consumers compare instants (listing `endsAt` is UTC today).
4. Route 6 couldn't produce the example: the id derivation is now stated, and route 6 is asked to write the listing's `openings` window.
5. Only shelter openings had a producer; other kinds are written by a coordinator in the coordinator app.
6. Missing steward work (table, build filter, validation across files, write order, FEED.md fetching rules) is now in the acceptance list.
7. Ordering is now severity, then `startsAt`, then `id`.
8. A display window is set: from 48 hours before `startsAt`.
9. Copy uses absolute days and times, not "tonight"; the site shows a cached copy "as of" with a warning.
10. Alerts now carry the evidence fields, and the sensitive-location rule covers provenance spans.
11. Left to the site (`14-today-alerts`): words and icons for each severity, and a labelled region rather than `role="alert"` on load.
12. Smaller points (may-be-canceled alerts, `coverage`, a coherent sample shelter, references to #41, one `dataset` per run) are addressed.

## Learnings

- Went well: reviewing three requests as one design caught contradictions that only show up between files (a banner saying open over a card saying canceled).
- Surprising: the hardest part of alerts is withdrawal, not publication; the steward's route deliberately drops deactivation notices today.
- Next time: for anything time-bound, ask "how does this stop being true early?" before "how is it published?".
- Open: the steward's owner still has to accept or amend #41.
