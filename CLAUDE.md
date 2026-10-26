# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ashland Daily Help lists community resources for Ashland, Oregon. The repo holds two apps:

- The new app at the repo root: a full-stack TypeScript app. All new work goes here.
- The original static site in `legacy/`, which still deploys to its own Worker until it is retired. See `legacy/CLAUDE.md`.

Scope: the prototype covers Ashland and services that include it (decided Oct 25). There are no area choices; listings, events and alerts are filtered with `server/listings/scope.ts`.

## More guidance, by folder

Claude Code loads these when it works on files in the folder; read the one you need before planning work that touches it.

- `app/CLAUDE.md`: routes, keeping the browser bundle light, English and Spanish, offline.
- `server/CLAUDE.md`: the feed ingest, listing search, chat, database and migrations.
- `e2e/CLAUDE.md`: running and writing the Playwright journeys.
- `legacy/CLAUDE.md`: the static site.

## Sibling repos

Both are usually checked out next to this one; check they exist before relying on them.

- [RVAILab/daily-help-steward](https://github.com/RVAILab/daily-help-steward) (`../daily-help-steward`) collects resources and events: it harvests what providers already publish, reconciles it through a human review queue, keeps provenance for every field, and publishes the feed this app reads, at `https://steward.ashlanddailyhelp.com/feed/` (`FEED_BASE_URL` in `wrangler.jsonc`; a folder, so the bare URL answers 404). It publishes `listings.json` and `pulse.json`; `events.json` and `alerts.json` are this app's proposals (steward #40, #41), and the app treats their 404s as not published yet. The feed contract belongs to the steward: validate against its schema (`schema/feed/`, `src/contract/feed.ts`) rather than redefining it, and send contract changes to the steward as requests. Provider details belong to the steward too.
- [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise) (`../RogueRaise`) holds the notes from Rogue Raise: The Unhoused (October 23–25, 2026), where this app was built, in `2026-10-unhoused/`. Its `RESOURCES.md` has a dated snapshot of the team's spreadsheet, compiled separately from this repo; when it and the steward's feed disagree, raise it with the steward rather than editing data here. It also describes this repo, so update it if the app's scope changes.

## The new app

It reads the steward's feed, keeps its current state in Postgres, and serves the public. Its user stories are in `user-stories/`, managed with `/stories` (board: `user-stories/index.html`).

- Server: TypeScript on Cloudflare Workers (`workers/app.ts`), including a scheduled feed ingest. Deploys to the `ashlanddailyhelp-app` Worker.
- Client: React Router 8 in framework mode with `@cloudflare/vite-plugin`, rendered on the server and kept light for old phones and weak connections; an installable, offline-capable PWA in English and Spanish.
- Database: Postgres through Drizzle ORM (Neon in production, set up once by hand: README, "Production setup").
- Chat: Claude answers questions on the site and by text, only from what's in the directory.
- TypeScript 7 strict with `noUncheckedIndexedAccess` and no `any`. Validate everything that crosses a boundary (feed files, requests, environment) where it enters, and trust the types inside.
- Biome for lint and format (single quotes, no semicolons, 120 columns).

Commands: `npm run dev`, `npm run check` (lint, typecheck, tests; the pre-push hook runs it), `npm test`, `npm run e2e`, `npm run lint`, `npm run typecheck`, `npm run db:start` (a private Postgres on port 5433), `npm run db:generate`, `npm run db:migrate`, `npm run feed:ingest`, `npm run feed:sync`, `npm run chat:eval`. The scripts behind them are in `scripts/`. Local secrets go in `.dev.vars` (see `.dev.vars.example`).

## How we work

We work in the eXtreme Programming tradition of Pivotal Labs.

- Test first: write a failing test, make it pass with the simplest code, then refactor. Every change in behaviour comes with a test.
- A story's acceptance criteria become tests. A story is done when they pass, not when the code is written.
- Test at the lowest level that proves the behaviour: unit tests for pure logic; integration tests against a real Postgres, not mocks, for queries and migrations; React component tests that find elements by role and label, as people and assistive technology do; and a few end-to-end journeys in a real browser.
- Vitest runs `*.test.ts` in Node and `*.test.tsx` in happy-dom (Testing Library). Database tests use PGlite through `test/db.ts`.
- Don't mock what we don't own. Stand in for the steward with its sample feed (`test/fixtures/feed-sample/`).
- Small steps and small commits. Commit to `main` whenever the tests pass. `main` deploys on every push, so it must always be releasable.
- Trunk-based: everything happens on `main`, with no feature or story branches. This overrides the `/stories` skill: `activate` moves the story to `current/` on `main` without creating a `story/<name>` branch, and `review` diffs from the commit that activated the story.
- Run the whole suite before every push. CI runs type checks, lint and tests; the Playwright journeys are not in CI for now, so run `npm run e2e` locally before pushing a change to pages.
- Do the simplest thing that could possibly work (YAGNI): no speculative abstractions, flags or configuration. Remove duplication when it appears, not before.
- Names say what code does. Comment only to explain why something non-obvious is the way it is (a constraint, a workaround, a decision). No comments that restate the code, and no commented-out code.
- Keep refactoring and behaviour changes in separate commits.
- When you add a folder with rules of its own, or a rule here only matters in one folder, give it a `CLAUDE.md` there and list it above.

## Content rules

The app is careful about evidence, because people act on it:

- Listings say only what a provider's own source states, with phrasing like "Website lists…" and "Confirm before visiting". Unconfirmed fields say "Not confirmed" rather than guessing.
- Provider confirmation is a separate, still-pending step; never imply a listing was confirmed by its provider.
- When sources disagree, say so ("Schedule needs checking") rather than picking one.
- Sample or fictional numbers are always labeled as such. Never present them as real service statistics.
