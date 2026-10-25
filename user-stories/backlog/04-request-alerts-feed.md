<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:35:21-07:00
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

- Blocks `15-today-alerts`.
- The steward already has a `city_alert` source type and a cold-weather fixture (`fixtures/alerts/cold-weather-2026-10-25.html`).

## Implementation Plan

[to be filled in by /stories plan]
