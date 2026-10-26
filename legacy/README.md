# Ashland Daily Help: the static site

The original installable, offline-capable site built at Rogue Raise, deployed to <https://ashlanddailyhelp.kitchenlab.workers.dev> (the `ashlanddailyhelp` Worker). New work goes in the app at the repo root; see the [main README](../README.md).

It is plain HTML, CSS and ES modules with no build step or dependencies. Serve the folder over HTTP (the service worker needs `http(s):`, not `file:`):

```sh
python3 -m http.server 8000 --directory legacy
```

## With the steward feed

The site reads listings and Community Pulse from the steward's `listings.json` and `pulse.json`. Their location is the `FEED_BASE` constant at the top of `legacy/app.js`, defaulting to `./feed/` and overridden by `<meta name="feed-base">` in `legacy/index.html`, which points at the steward's live feed, `https://steward.ashlanddailyhelp.com/feed/`. To try a local feed, remove or change that meta tag.

With no feed, the site uses `legacy/data.js` and the built-in fictional sample week. No feed is committed (`feed/` is ignored). To try it locally, either:

- copy the steward's sample feed into `legacy/feed/` and serve the site:

  ```sh
  mkdir -p legacy/feed && cp ../daily-help-steward/fixtures/feed-sample/*.json legacy/feed/
  python3 -m http.server 8000 --directory legacy
  ```

- or run the steward's reference feed server (`npm run steward -- serve` in `../daily-help-steward`) and set the `feed-base` meta tag to its URL.

How it behaves:

- **Find help** loads `listings.json` at startup: network first, then the copy cached on this device, then `data.js`. The service worker keeps the last good copy for offline use. The directory footer shows "Listings as of" the feed's `generatedAt`. Invalid JSON, a failed check or an unknown major version counts as a failed fetch.
- **Listing labels** come from the feed: `provenanceLabel`, `unconfirmed`, `mayBeCanceled`, `conflict` and `endsAt` (shown as an end time; the listing hides once it has passed).
- **Community Pulse** fetches `pulse.json` once at startup and every 30 seconds while Pulse is open and the tab is visible, with `If-None-Match` when the server sends an ETag. On errors it keeps what's on screen, marks it "Last updated", and backs off. `pulse.json` is never cached for offline use.
- **Sample wording** follows `pulse.json`'s `dataset`: `FICTIONAL_DEMONSTRATION` keeps every "sample" and "fictional" label; `LIVE` removes them, and the CSV download carries the real label.

## Static site deploys

- Files are served as committed. `legacy/.assetsignore` keeps `feed/`, Markdown, dotfiles and the deploy files out of the upload.
- Cloudflare sends `Cache-Control: public, max-age=0, must-revalidate` with an ETag for every file, so browsers check for updates on each visit. Returning visitors still pick up new shell files only when the cache name in `legacy/sw.js` changes.
- `legacy/worker.js` serves `/index.html` directly (Cloudflare would otherwise redirect it to `/`, which breaks the offline copy `sw.js` keeps). Every other path comes straight from the static files.
- To deploy by hand: `npx wrangler deploy -c legacy/wrangler.jsonc` (log in first with `npx wrangler login`).
