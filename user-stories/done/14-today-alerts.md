<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:26:16-07:00
  planned_at:   2026-10-25T14:26:37-07:00
  finished_at:  2026-10-25T14:38:01-07:00
  updated_at:   2026-10-25T14:38:01-07:00
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

## Review

Reviewed 2026-10-25 by an independent agent; findings fixed in the next commit unless noted.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Alerts first on /today and the homepage, with kind, message, window, links | ✅ | `app/components/alert-list.tsx`, after the page heading; listing links only when stored |
| Gone after the end time, before the next refresh | ✅ | `currentAlerts`; /today regroups at the soonest end |
| Affected listings and events show the alert | ⚠️ | Listings ✅, with cancellations; events not yet |
| Severity by word and shape, read once | ✅ | Plain region, not live |
| Offline | ⚠️ | With `15-offline-pwa` |

Fixed: a canceled shelter's cards still said it was open; closure alerts didn't stop "Open now"; demonstration alerts weren't labelled; alerts showed up to 48 hours early (now a day); headings came before the page's `h1`; /today didn't regroup when an alert ended. Left: alerts on events, `kind`, provenance label, and the extra listings query when alerts exist.

## Learnings

- Went well: one helper (`pageAlerts`) gives every page the same alerts, so each fix landed everywhere at once.
- Surprising: the alert's title is a claim ("open Sunday night") that becomes false when the alert's status changes.
- Next time: show status wherever a title is reused.
