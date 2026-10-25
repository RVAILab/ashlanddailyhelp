<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:43:44-07:00
  planned_at:   2026-10-25T15:47:20-07:00
  finished_at:
  updated_at:   2026-10-25T15:47:20-07:00
-->

# Story: Find Help Nearby

## Summary

AS someone looking for help
I WANT to sort services by how close they are
SO THAT I can reach one on foot or by bus

## Acceptance Criteria

- With permission, the device's location sorts results by distance; the location is used on the device and never sent to the server.
- Without permission, results keep their usual order; nothing else asks for a place.
- Distances are shown in miles and as walking time where it makes sense.
- Sensitive locations are never placed on a map or given a distance.

## Notes

- Blocked by `22-request-coordinates` for real data: until the steward publishes `geo` (steward #62), every place shows "Distance not known".
- Changed Oct 25 at the user's request: no "pick a part of Ashland". The town is small enough that services cover it rather than a neighborhood.

## Implementation Plan

Distances are worked out on the device. The search page, which already hydrates, gets a "Sort by distance from me" button. It asks the browser for the location, sorts the cards it already has, and shows the miles and walking time on each card. No request carries the location.

1. **`app/lib/nearby.ts`** (ships to the browser): `milesBetween` (haversine), `walkMinutes` (about 20 minutes a mile, only up to 2 miles), and `byDistance(cards, from)`, which puts places with no location last in their order.
2. **`app/lib/card-data.ts`.** A card carries `geo` (`lat`, `lng`) when the listing has it. The contract has already dropped it for sensitive locations.
3. **`app/routes/resources.tsx`.** A `NearbySort` component shows the button only once hydrated (a page with no JavaScript has no location). Its states:
   - asking: "Finding where you are…";
   - denied or unavailable: "Couldn't get your location. Results stay in their usual order.";
   - sorted: "Sorted by distance from you. Your location stays on this phone.", with a way back to the usual order.
4. **`app/components/listing-card.tsx`.** An optional distance line: "0.4 mi · about 8 min walk", or "Distance not known".

Data model: none.

Tests:

- `nearby.test.ts`.
- `resources.test.tsx`: with a stubbed `navigator.geolocation`, the button sorts and shows distances, and makes no `fetch`; when location is denied, the message appears and the order is kept; with no geo, cards say "Distance not known".

