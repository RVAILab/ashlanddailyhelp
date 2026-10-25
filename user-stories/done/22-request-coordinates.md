<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:38:53-07:00
  planned_at:   2026-10-25T15:40:44-07:00
  finished_at:  2026-10-25T15:46:34-07:00
  updated_at:   2026-10-25T15:46:34-07:00
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


## Review

Reviewed 2026-10-25 at `71d9516` plus fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| A proposed optional field with coordinates and their provenance | ✅ | Steward #62: `listings[].geo` (`lat`, `lng`, `source`, `matchedAddress`, `by`, `observedAt`) with `provenance.geo`. Accepted here in `server/feed/contract.ts` (`Geo`). |
| Never present for a sensitive location | ✅ | `ListingsFile`'s transform drops `geo` and `provenance.geo` for the sensitive wording (`server/feed/contract.test.ts`). |
| The steward's owner has accepted or amended the proposal | ⚠️ | #62 is open, with refinements added as a comment. Pending on the steward. |

These findings were fixed:

- A sensitive listing kept `provenance.geo`, whose Census link carries the address. It is now dropped too.
- The proposal now says to publish `geo` only for the current address, and that `provider` points can wait (comment on #62).
- Refactor: `openings` are now read with the steward's 1.4 `FeedOpening`, not our proposal-era copy, so its checks apply.

## Learnings

- **Went well:** the steward already geocodes, so the request was "publish what you have" and could name its real columns.
- **Surprising:** provenance can leak what the field itself hides. A geocoder's source link is the address.
- **Next time:** when a field is withheld for privacy, check its provenance, its quotes and its links for the same value.
