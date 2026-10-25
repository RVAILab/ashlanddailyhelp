<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T13:15:37-07:00
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

[to be filled in by /stories plan]
