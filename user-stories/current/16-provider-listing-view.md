<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:44:40-07:00
  planned_at:   2026-10-25T14:44:57-07:00
  finished_at:
  updated_at:   2026-10-25T14:44:57-07:00
-->

# Story: Provider Listing Check and Corrections

## Summary

AS a provider
I WANT to see exactly how my listing appears and where each detail came from, and to ask for a correction
SO THAT people get accurate information about my service

## Acceptance Criteria

- A provider can find their listings by provider name.
- They see the public listing plus the provenance of every field.
- "Request a correction" sends them to the steward's intake (an address or form the steward owns), with the listing id filled in.
- The app has no provider accounts and stores nothing about the request.
- Every resource page links here as "Report a problem with this listing".

## Notes

- From `11-translate-listings`: readers can report a bad automatic translation from the same report page.
- From `09-resource-detail`: add the "Report a problem with this listing" link to the listing page (`app/routes/resource.tsx`) when this page exists.
- Decided Oct 25: providers are read-only plus links; all collecting stays in the steward.
- The steward's intake address is in its `docs/CONTEXT.md` (decision 11). Ask the steward's owner whether a form is coming before hard-coding an email address.

## Implementation Plan

Two server-rendered pages, both without JavaScript: `/providers` finds listings by provider name, and `/report?listing=<id>` shows one listing as the public sees it with every field's sources laid out, and a "Request a correction" email link to the steward's intake, prefilled with the listing id and page address. The address comes from a `CORRECTIONS_EMAIL` Worker variable rather than the code (the steward's intake is a personal address for now, steward `docs/CONTEXT.md` decision 11; it can change to a form later). Without it, the page says corrections can't be sent online yet and gives 211. Nothing about the request touches this app.

### Steps

1. `server/listings/providers.ts`: `listingsByProvider(db, name, now)`, case-insensitive, within the Ashland scope.
2. `app/routes/providers.tsx` and `app/routes/report.tsx` (`hydrate: false`); `correctionsEmail` in the request services from the Worker's env.
3. The listing page links "Report a problem with this listing"; `?about=translation` marks a report about an automatic translation; About's provider section links to `/providers`.

### Tests

Provider search (case, scope, empty), the report page (provenance, mailto with id, without an address), the links, and no JavaScript.
