<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:43:44-07:00
  planned_at:   2026-10-25T15:47:20-07:00
  finished_at:  2026-10-25T15:54:37-07:00
  updated_at:   2026-10-25T15:54:37-07:00
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


## Review

Reviewed 2026-10-25 at `cafd02f` plus fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| With permission, sort by distance; the location stays on the device | ✅ | `NearbyResults` in `app/routes/resources.tsx` keeps the position in component state. The test checks no `fetch` is made. |
| Without permission, the usual order | ✅ | Location is asked for only on a press. When it's denied, the order stays and a message says so (tested). |
| Miles and walking time where it makes sense | ✅ | `app/lib/nearby.ts`: walking time up to 2 miles. "Under 0.1 mi" for very close places. |
| Sensitive locations never placed or measured | ✅ | The contract drops `geo` (story 22). Such places sort last as "Distance not known". |

These findings were fixed:

- `disabled` while asking dropped keyboard focus from the button. It now uses `aria-disabled` and ignores repeat presses.
- Going back to the usual order wasn't announced. The live region now says "Back in the usual order."
- There was no test that `toCard` carries `geo`. One is added.

Not changed:

- A new search while sorted keeps the earlier position.
- Real distances wait on the steward publishing `geo` (#62).

## Learnings

- **Went well:** doing it on the device kept the privacy promise simple to state and to test: no request carries the location.
- **Surprising:** `disabled` on a focused button drops focus in Chrome and Safari.
- **Next time:** use `aria-disabled` for buttons that are briefly busy.
