# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ashland Daily Help: a static, dependency-free web app (plain HTML, CSS and ES modules) listing community resources for Ashland and Jackson County, Oregon. It is an installable, offline-capable PWA. There is no package.json, bundler, linter or test suite in the repo; files are served exactly as committed.

It is being replaced by a full-stack app (see "The new app" and "How we work"). Until that ships, the "Static site" sections below describe what is live today.

## Sibling repo: RogueRaise

This app was built at Rogue Raise: The Unhoused (October 23–25, 2026). Its event notes live in [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise), a Markdown-only repo with its own `CLAUDE.md`, usually checked out next to this one at `../RogueRaise` (check it exists before relying on it). The relevant folder is `2026-10-unhoused/`:

- `README.md`: the event summary, tracks and format.
- `RESOURCES.md`: team links, hotlines and a dated snapshot of the team's master spreadsheet ("Ashland Resources for Unhoused People"). That directory is broader than `data.js` and was compiled separately; it is not generated from this repo or vice versa.

Keep the two in step: when a provider's details change in `data.js`, check whether the `RESOURCES.md` snapshot needs the same change, and the reverse. RogueRaise's `RESOURCES.md` describes this repo too, so update it if the app's scope changes.

## Backend repo: daily-help-steward

Collection and ingest of resources and events is moving to a separate app, [RVAILab/daily-help-steward](https://github.com/RVAILab/daily-help-steward), usually checked out next to this one at `../daily-help-steward` (check it exists before relying on it). The steward harvests what providers already publish, reconciles it through a human review queue, and keeps provenance for every field. It will be deployed separately and serve the data this app displays through an API; this app stays a static front end.

The app reads the steward's feed (`listings.json`, `pulse.json`; contract in the steward's `docs/FEED.md`) from `FEED_BASE` in `app.js` (default `./feed/`, overridable with `<meta name="feed-base">`). With no valid feed it falls back to the bundled `data.js` and the built-in sample week. Feed checks live in `core.js` (`checkListingsFeed`, `checkPulseFeed`). The service worker caches `listings.json` but never `pulse.json`. "Sample"/"fictional" copy is tagged `data-demo` / `data-live` in `index.html` (or passed through `plain()` in `app.js`) and follows `pulse.json`'s `dataset`. See the README's "With the steward feed". Keep field names and enum values in `data.js` and `core.js` aligned with the steward's contract; when you change them here, flag that the steward needs the same change.

## The new app

The new app reads the steward's feed, keeps its current state in Postgres, and serves the public. Nothing in the static site needs to be preserved. Its user stories are in `user-stories/`, managed with `/stories` (board: `user-stories/index.html`).

- Server: TypeScript on Cloudflare Workers, the platform the steward uses, including the scheduled feed ingest.
- Client: React with TypeScript, rendered on the server and kept light for old phones and weak connections; an installable, offline-capable PWA in English and Spanish.
- Database: Postgres, reached from the Worker (for example through Hyperdrive), with migrations in the repo.
- TypeScript in strict mode, with no `any`. Validate everything that crosses a boundary (feed files, requests, environment) where it enters, and trust the types inside.
- The feed contract belongs to the steward. Validate against its schema (`../daily-help-steward/schema/feed/`, `src/contract/feed.ts`) rather than redefining it by hand, and send contract changes to the steward as requests.

The framework, Postgres host and tooling are chosen in the `1-cloudflare-app-setup` story; record them here once chosen.

## How we work

We work in the eXtreme Programming tradition of Pivotal Labs.

- Test first: write a failing test, make it pass with the simplest code, then refactor. Every change in behaviour comes with a test.
- A story's acceptance criteria become tests. A story is done when they pass, not when the code is written.
- Test at the lowest level that proves the behaviour: unit tests for pure logic; integration tests against a real Postgres, not mocks, for queries and migrations; React component tests that find elements by role and label, as people and assistive technology do; and a few end-to-end journeys in a real browser.
- Don't mock what we don't own. Stand in for the steward with its sample feed (`../daily-help-steward/fixtures/feed-sample/`).
- Small steps and small commits. Commit to `main` whenever the tests pass. `main` deploys on every push, so it must always be releasable.
- Trunk-based: everything happens on `main`, with no feature or story branches. This overrides the `/stories` skill: `activate` moves the story to `current/` on `main` without creating a `story/<name>` branch, and `review` diffs from the commit that activated the story.
- Run the whole suite before every push. CI runs type checks, lint and tests on every push and pull request.
- Do the simplest thing that could possibly work (YAGNI): no speculative abstractions, flags or configuration. Remove duplication when it appears, not before.
- Names say what code does. Comment only to explain why something non-obvious is the way it is (a constraint, a workaround, a decision). No comments that restate the code, and no commented-out code.
- Keep refactoring and behaviour changes in separate commits.

## Static site: running locally

Serve the repo root over HTTP; the service worker and URL state need `http(s):`, not `file:`:

```sh
python3 -m http.server 8000
```

`core.js` and `data.js` have no DOM dependencies, so their logic can be exercised directly with Node:

```sh
node --input-type=module -e "import { filterResources } from './core.js'; import { resources } from './data.js'; console.log(filterResources(resources, { query: 'shower' }).map(r => r.id))"
```

## Static site: architecture

### Scripts

- `data.js`: all content. `resources` (real providers, each spreading a shared `evidence` object with `reviewedDate`, verification status and unknown capacity), `categories`, and the deliberately fictional `demoEvents` / `initialReports` used by the Community Pulse and provider views.
- `core.js`: pure functions: resource filtering, report validation, the pending → approved review queue, and aggregation into dashboard totals and daily series.
- `app.js`: everything DOM-related. One module, no framework; it renders with template strings via `$`/`$$` helpers, and any data interpolated into HTML must go through `escape()`. Icons are inline SVG path strings in the `paths` map, applied to `[data-icon]` elements.

### Views and routing

`index.html` holds four `<section class="view">` elements (`#view-resources`, `#view-impact`, `#view-providers`, `#view-about`); `navigate()` toggles `hidden` on them. State lives in query parameters, not paths or hashes: `?view=`, `q`, `category`, `area`, `list` (shared list of resource IDs) and `resource` (open detail dialog). `setURL()` writes them and `readURL()` (also the `popstate` handler) restores them. Valid values are whitelisted in `readURL()`, so new views, categories or areas must be added there too.

### State and privacy

Saved resources persist in `localStorage` under `community-hub:saved:v1`; the hero video pause preference uses `community-hub:hero-motion`. Report submissions and approvals are in-memory only and reset on reload; nothing is sent to a server. The "clear device" action removes these keys, deletes `hub-preview-*` caches and unregisters the service worker.

### Service worker and build version

`sw.js` pre-caches the files in `SHELL` and lazily caches `art/` images matching the `ART` regex. The cache name `hub-preview-<hash>` matches `version` in `build.json`; both are produced by an external build step that is not in this repo. When adding a top-level file the app needs offline, add it to `SHELL`. When changing shell files, change the cache name so returning visitors pick up the new files. Never cache API, account or report paths.

### CSS cascade

Stylesheets load in this order, and the order matters:

1. `styles.css`: original base, in `@layer base, components, responsive`.
2. `direction.css`: in `@layer direction`.
3. `experience.css`: unlayered, so it beats both files above regardless of specificity. Owns design tokens, `@font-face`, global chrome and the resources view.
4. `pulse.css`: every selector scoped under `#view-impact`.
5. `pages.css`: every selector scoped under `#view-providers` or `#view-about`.

Put new work in the unlayered file that owns that view; keep the per-view scoping.

### Assets

`art/` holds each image in AVIF, WebP and a JPG/PNG fallback at several widths (`name-<width>.<ext>`, `-m-` for mobile crops), used via `<picture>`. Fonts are self-hosted WOFF2 under the SIL OFL (`fonts/OFL.txt`); application code is MIT (`LICENSE`).

## Content rules

The data and UI copy are deliberately careful about evidence:

- Listings say only what a provider's own `source` page states, with phrasing like "Website lists…" and "Confirm before visiting". Unconfirmed fields say "Not confirmed" rather than guessing.
- `providerConfirmedAt` is `null` for every listing; provider confirmation is a separate, still-pending step.
- Set `conflict: true` when sources disagree; the UI then shows "Schedule needs checking".
- Pulse and provider-view numbers are fictional, and are labeled that way in the UI and in the CSV export (`FICTIONAL_DEMONSTRATION`). Never present them as real service statistics.
- Canceled or unknown events never carry an amount; `validateReport()` enforces this.
- Every chart state carries a shape and a word, not only a colour; bars use a labelled linear scale from zero.
- Motion is progressive enhancement, gated on `prefers-reduced-motion` and Save-Data.
