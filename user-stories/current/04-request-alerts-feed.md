<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:14:19-07:00
  planned_at:   2026-10-25T12:14:19-07:00
  finished_at:
  updated_at:   2026-10-25T12:17:04-07:00
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
