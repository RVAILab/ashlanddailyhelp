<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T14:38:51-07:00
  planned_at:   2026-10-25T14:39:24-07:00
  finished_at:
  updated_at:   2026-10-25T14:39:24-07:00
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

- From `07-browse-and-search`: offline, search runs on the device over the cached listings (the same words, kind of help and area filters as `/resources`).
- The old site's `sw.js` shows the pattern: network first, last good copy offline, version-named caches.

## Implementation Plan

A hand-written service worker (`public/sw.js`): pages and route data from the network first, the last saved copy when offline; hashed build assets cached once (their names change with each build, so a deploy replaces them). After installing it saves the homepage, /today, search, About, and every listing page (from `/offline-pages.json`). A small inline script on every page registers it and shows "You're offline" when the browser is; the homepage stays script-free otherwise. `/forget` answers with `Clear-Site-Data`, which removes caches, storage, cookies and the worker without JavaScript; the footer links to it.

Changed in planning: offline search shows every saved listing with a note that searching needs a connection (filtering on the device needs the listings in the page; worth a later story). Lists work offline with `17-shareable-lists`. There are no images or motion yet, so Save-Data has nothing to turn off; `19-legacy-look` gates its art and motion on it.

### Tests

Unit tests for `/offline-pages.json` and `/forget`; end-to-end: the worker installs, then offline the homepage, /today and a listing page load from the device with the offline notice, and the health check is never cached.
