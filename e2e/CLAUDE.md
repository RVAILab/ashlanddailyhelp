# End-to-end journeys

Playwright journeys in a mobile browser (Pixel 7) against the built Worker (`vite preview` on port 4173) and a real Postgres. They are not in CI for now: run `npm run e2e` locally before pushing a change to pages, and before reviewing a visual story.

- Start Postgres first (`npm run db:start`). `global-setup.ts` refreshes the live snapshot in `test/fixtures/feed-live/` if it is over a day old, migrates the database and ingests the snapshot. Its listings change with the steward's data, so name only long-standing ones (such as `ohra-showers`) and prove details in unit tests on the sample feed.
- Nothing reaches the network during a run: the browser resolves only localhost (`playwright.config.ts`), and `offline-server.ts` points the preview server's chat calls at a closed local port, so questions get the fallback answer and cost nothing.
- Locally, Playwright reuses a server already on port 4173, which may be serving an old build. Stop it if your change doesn't show up.
- Keep journeys few: one per thing a person does. Prove details in unit and component tests.
- Find elements by role and label, as in the component tests.
- Never use `page.waitForFunction` with an async function: its promise is truthy, so it passes at once. Poll with `expect.poll(() => page.evaluate(...))`.
- Service worker and cache work is asynchronous after navigation; poll for it rather than reading once.
- `/ask` allows 10 questions a minute per connection. Tests that ask send their own random `CF-Connecting-IP` (see `ask.spec.ts`) so back-to-back runs don't hit the limit.
