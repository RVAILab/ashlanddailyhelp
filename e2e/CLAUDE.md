# End-to-end journeys

Playwright journeys in a mobile browser (Pixel 7) against the built Worker (`vite preview` on port 4173) and a real Postgres. They are not in CI for now: run `npm run e2e` locally before pushing a change to pages, and before reviewing a visual story.

- Start Postgres first (`npm run db:start`). `global-setup.ts` migrates it and ingests the sample feed from `test/fixtures/feed-sample/`, so journeys can rely on its listings (such as `ohra-showers`).
- Locally, Playwright reuses a server already on port 4173, which may be serving an old build. Stop it if your change doesn't show up.
- Keep journeys few: one per thing a person does. Prove details in unit and component tests.
- Find elements by role and label, as in the component tests.
- Never use `page.waitForFunction` with an async function: its promise is truthy, so it passes at once. Poll with `expect.poll(() => page.evaluate(...))`.
- Service worker and cache work is asynchronous after navigation; poll for it rather than reading once.
- `/ask` allows 10 questions a minute per connection. Tests that ask send their own random `CF-Connecting-IP` (see `ask.spec.ts`) so back-to-back runs don't hit the limit. Prefer questions the directory can't answer: they get the 211 answer without a model call.
