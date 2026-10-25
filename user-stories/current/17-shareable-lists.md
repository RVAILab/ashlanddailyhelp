<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:54:08-07:00
  planned_at:   2026-10-25T14:54:32-07:00
  finished_at:
  updated_at:   2026-10-25T14:54:32-07:00
-->

# Story: Shareable Resource Lists

## Summary

AS a navigator or caseworker
I WANT to build a short list of resources for someone and send it by link or text
SO THAT they have the right places on their phone without an account

## Acceptance Criteria

- Add and remove resources from a list on any page; the list is saved on the device.
- Share the list as a link that opens the same list, short enough to text.
- An opened shared list shows current details from the feed, not a stale copy.
- Works offline and in English and Spanish.
- No account, and nothing about the list or its recipient is stored on the server.

## Notes

- The old site's `?list=` parameter shows the idea.

## Implementation Plan

The list lives in a `saved` cookie on the device (ids only, at most 30), changed through `/list/toggle?id=…&return=…` links that set it and go back, so adding and removing works without JavaScript, the same way the language switch does. The server reads the cookie to show "Saved" and the list, and stores nothing. `/list` shows the saved list with current details from the stored feed; `/list?ids=a,b,c` is the shared form, short enough to text, with a "Text this list" (`sms:`) link and "Save this list on my device". Ended or unknown ids are left out and counted. Offline, the saved copy of `/list` shows the last list; changing it needs a connection.

### Tests

Cookie parsing and limits, the toggle route (add, remove, safe return, cookie attributes), the list page (saved, shared, unknown ids, share links), cards and listing pages showing Add or Remove, and an end-to-end journey adding two listings and opening the shared link.
