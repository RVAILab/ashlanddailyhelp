<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:26:16-07:00
  planned_at:   2026-10-25T14:26:37-07:00
  finished_at:
  updated_at:   2026-10-25T14:26:37-07:00
-->

# Story: Today: Alerts and Cancellations

## Summary

AS someone looking for help
I WANT urgent alerts at the top of /today and on the homepage
SO THAT I know about an open warming shelter or a canceled meal before I travel

## Acceptance Criteria

- Active alerts appear first on /today and as a banner on the homepage, with kind, message, time window and links to what they affect.
- An alert disappears after its end time, even before the next feed refresh.
- Affected listings and events show the alert on their cards and detail pages.
- Severity is shown by a word and an icon, not only colour. Screen readers hear a new alert once, not on every refresh.
- Offline, the last alerts show with "as of" and a warning that they may be out of date. (With `15-offline-pwa`.)

## Notes

- Blocked by `04-request-alerts-feed`.

## Implementation Plan

Ingest the proposed `alerts.json` (steward #41) like the events file (optional until the steward publishes it), and show current alerts first on the homepage and `/today`, and on the cards and pages of the listings they name.

### Steps

1. `AlertsFile` in `server/feed/contract.ts`; an `alerts` table; `server/feed/alerts.ts` with the spec and `currentAlerts(db, now)`: not ended, not withdrawn, urgent first, then by start, then id.
2. `runIngest` refreshes alerts after listings and events.
3. `app/components/alert-list.tsx`: each alert as a labelled region with a severity word and shape ("Urgent", "Notice"), its title, message, times, status (canceled or may be canceled with its note) and links to the listings and events it names. A plain region, not a live one, so screen readers read it once with the page.
4. Homepage (still no JavaScript) and `/today`: a loader reads current alerts and shows them first. Listing cards and listing pages show the title of any alert that names them.

### Tests

Contract and ingest (stored, 404 quiet), expiry and order, withdrawn alerts hidden, the component, the homepage and `/today` loaders, and a card naming its alert.
