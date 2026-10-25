# Ashland Daily Help

A community resource hub for Ashland and Jackson County, Oregon: food, showers, shelter and someone who knows the way. It is a static, installable, offline-capable web app with no build step or dependencies.

## Origin

Built at [Rogue Raise: The Unhoused](https://whiterabbitashland.com/rogue-raise) (October 23–25, 2026), White Rabbit's weekend community build in Ashland. Event notes, team links, hotlines and a dated snapshot of the local resource directory live in the sibling repo [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise), under [`2026-10-unhoused/`](https://github.com/RVAILab/RogueRaise/tree/main/2026-10-unhoused). Locally it is usually checked out next to this repo at `../RogueRaise`.

## Backend

Collection and ingest of resources and events is handled by a separate app, [RVAILab/daily-help-steward](https://github.com/RVAILab/daily-help-steward), which harvests what providers already publish and routes changes through human review. Once deployed, it will provide an API that this app calls for its data. Until then, the app uses the bundled data in `data.js`.

## Running locally

Serve the repo root over HTTP (the service worker needs `http(s):`, not `file:`):

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

### With the steward feed

The site reads listings and Community Pulse from the steward's feed: `listings.json` and `pulse.json` (contract: the steward's [`docs/FEED.md`](https://github.com/RVAILab/daily-help-steward/blob/main/docs/FEED.md)). Its location is the `FEED_BASE` constant at the top of `app.js`, defaulting to `./feed/`. To point at another host without editing code, add `<meta name="feed-base" content="https://feed.example.org/">` to `index.html`.

With no feed, the site works exactly as before: listings from `data.js` and the built-in fictional sample week. No feed is committed here (`feed/` is ignored). To try it locally, either:

- copy the steward's sample feed into `./feed/` and serve the site:

  ```sh
  mkdir -p feed && cp ../daily-help-steward/fixtures/feed-sample/*.json feed/
  python3 -m http.server 8000
  ```

- or run the steward's reference feed server (`npm run steward -- serve` in `../daily-help-steward`) and set the `feed-base` meta tag to its URL.

How it behaves:

- **Find help** loads `listings.json` at startup: network first, then the copy cached on this device, then `data.js`. The service worker keeps the last good copy for offline use. The directory footer shows "Listings as of" the feed's `generatedAt`. Invalid JSON, a failed check or an unknown major version counts as a failed fetch.
- **Listing labels** come from the feed: `provenanceLabel`, `unconfirmed`, `mayBeCanceled`, `conflict` and `endsAt` (shown as an end time; the listing hides once it has passed).
- **Community Pulse** fetches `pulse.json` once at startup and every 30 seconds while Pulse is open and the tab is visible, with `If-None-Match` when the server sends an ETag. On errors it keeps what's on screen, marks it "Last updated", and backs off. `pulse.json` is never cached for offline use. Practice reports approved in the provider preview stay in this tab on top of the feed.
- **Sample wording** follows `pulse.json`'s `dataset`: `FICTIONAL_DEMONSTRATION` keeps every "sample" and "fictional" label; `LIVE` removes them, and the CSV download carries the real label.

## Data and accuracy

Listings say only what each provider's own website states, and none has been confirmed with the provider yet. Confirm hours and eligibility before visiting or referring anyone. The Community Pulse and provider-view numbers are fictional demonstration data, not real service statistics.

## License

Application code is MIT ([`LICENSE`](LICENSE)). Bundled fonts are under the SIL Open Font License ([`fonts/OFL.txt`](fonts/OFL.txt)).
