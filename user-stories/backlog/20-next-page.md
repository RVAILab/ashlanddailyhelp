<!--
metadata:
  created_at:   2026-10-25T14:44:10-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T14:44:10-07:00
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

[to be filled in by /stories plan]
