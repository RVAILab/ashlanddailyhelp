<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Installable Offline App

## Summary

AS someone with an old phone, little data or no signal
I WANT to install the app and keep using it from the last copy
SO THAT I can still find help when I'm offline

## Acceptance Criteria

- Installable, with a manifest and icons.
- A service worker keeps the app shell, the homepage, /today, browse and every resource page available from the last good data.
- Data is network first with a fallback to the device copy, labelled "as of" its time. Pages say clearly when they are offline.
- Saved and shared lists and the chosen language work offline.
- No API, account or report paths are cached.
- A new deploy replaces the cached shell on the next visit.
- Save-Data turns off images and motion.
- "Clear this device" removes everything the app stored, and unregisters the service worker.

## Notes

- The old site's `sw.js` shows the pattern: network first, last good copy offline, version-named caches.

## Implementation Plan

[to be filled in by /stories plan]
