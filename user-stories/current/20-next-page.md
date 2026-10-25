<!--
metadata:
  created_at:   2026-10-25T14:44:10-07:00
  activated_at: 2026-10-25T15:16:55-07:00
  planned_at:   2026-10-25T15:17:45-07:00
  finished_at:
  updated_at:   2026-10-25T15:17:45-07:00
-->

# Story: The Next Meal and Place to Sleep

## Summary

AS someone who needs to eat or sleep soon
I WANT one very simple page that tells me where and when the next meal is, and the next place to sleep
SO THAT I can get there without reading through a directory

## Acceptance Criteria

- A page at `/next` shows, first, the next meal: where (the address, or "Location not published. Call the provider.") and when (open now until …, or the time it starts), worked out in Pacific time from the listings' opening windows and today's events.
- If known, it then shows the next shelter, place to sleep or place to camp: where, and when it is available (tonight's window, or "open now until …").
- Nothing else competes for attention: large type, one tap to call, a link to the listing for details, and a link to /today for more.
- When nothing is known, it says so plainly and points to /today and 211, never guessing.
- A meal or shelter whose schedule needs checking, may be canceled, or is closed by an alert is never shown as the next one.
- It loads no JavaScript files and works offline from the last saved copy.

## Notes

- Requested Oct 25.
- "Meal" means the food category; "place to sleep" means housing listings and events (shelters, severe weather shelters, campsites). Until the steward publishes opening windows (#39) and events (#40), the page will usually say nothing is known.

## Implementation Plan

A pure function picks the next meal and the next place to sleep from /today's grouping and today's events. A plain page shows the two picks in large type. Follow `/today`'s loader, with its alert closures, and `/print`'s no-JavaScript page.

1. **`server/next/next.ts`.** `nextPlace(groups, events, now, kind, closedEvents)` picks one entry.
   - A meal is the food category. A place to sleep is housing whose window runs overnight (it ends after 10 PM Pacific or on a later day). The steward doesn't yet tell a shelter from a housing-help office, which keeps office hours.
   - Candidates are open-now and later-today listings from `groupToday`, which already drops conflicts, may-be-canceled windows and alert closures. Today's events with a start time count too, unless they have a status or a conflict, or a closure alert names them or their listing.
   - The pick is the place open now for 30 minutes or more that stays open longest. Otherwise it is the soonest later start. Otherwise it is whatever is open now, even closing soon.
   - The address is the window's location, then the listing's or event's address.
2. **`server/feed/page-alerts.ts`.** Add `closedEvents` (the `eventIds` of in-effect closures and cancellations).
3. **`app/routes/next.tsx`** (`hydrate: false`), routed inside the locale layout.
   - It shows "Worked out at …", then a section for the next meal and a section for the next place to sleep. Each section has the name, where (the sensitive wording and "Not confirmed" rules from `listing-detail`), when ("Open now until 2:00 PM" or "Starts at 5:00 PM, until 7:00 PM"), a large Call button, and a Details link.
   - Empty states: "No meal we know of for the rest of today" and "No place to sleep we know of for tonight", each with links to /today and to call 211.
4. **Offline.** Add `/next` to `MAIN` in `app/routes/offline-pages.ts`. Add a link from the homepage and from /today.
5. **CSS.** Big type for the two picks.

Data model: none.

Tests:

- `server/next/next.test.ts`:
  - open now beats later;
  - 30 minutes or more beats closing soon;
  - a canceled, conflicting or closed-by-alert place is never picked;
  - a housing office with daytime hours isn't a place to sleep;
  - events count;
  - the window's location is used.
- `app/routes/next-loader.test.ts` with stored listings and openings.
- `app/routes/next.test.tsx` for the view and empty states.

Open question for the steward: a way to mark a listing as a place to sleep (a shelter or a camp), rather than guessing from overnight hours.

