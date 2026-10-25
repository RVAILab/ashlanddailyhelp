<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:38:53-07:00
  planned_at:   2026-10-25T15:40:44-07:00
  finished_at:
  updated_at:   2026-10-25T15:40:44-07:00
-->

# Story: Request Coordinates from the Steward

## Summary

AS the front-end team
I WANT latitude and longitude for each listing and event location
SO THAT people can find help nearby and open a map

## Acceptance Criteria

- A proposed optional field with coordinates and their provenance (geocoded from the address, or from the provider).
- Never present for a sensitive location.
- The steward's owner has accepted or amended the proposal.

## Notes

- Blocks `23-find-help-nearby` and map links that don't depend on the address text.

## Implementation Plan

The steward already geocodes listings (steward #55: `lat`, `lng` and `geo_provenance`, never for a sensitive address) but doesn't publish them. Ask it to publish them as an optional `geo` field in feed 1.5, as #39–#41 did for hours, events and alerts. Accept the field here at once.

1. **The request.** Filed as steward #62: `listings[].geo` (`lat`, `lng`, `source`: `geocoded` or `provider`, `matchedAddress`, `by`, `observedAt`) with `provenance.geo`. It is absent when the location is unknown or confidential, and never present for a sensitive location. Events get the same field when #40 lands.
2. **Accept it** (`server/feed/contract.ts`). Add `geo` to the known listing fields, validated: latitude from −90 to 90, longitude from −180 to 180, and a known source. Drop it for a listing whose address is the sensitive wording, even if the feed sends one.
3. **Store it.** Listings are stored whole as JSON, so there is no migration. Check that a stored listing keeps `geo`.

Data model: none. It rides in the stored listing JSON.

Tests:

- `server/feed/contract.test.ts`:
  - a listing with `geo` keeps it;
  - out-of-range coordinates make the file invalid;
  - a sensitive listing loses `geo`.

Open: the third criterion (the steward's owner accepts the proposal) waits on the steward.

