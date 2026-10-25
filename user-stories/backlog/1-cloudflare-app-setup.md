<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:06:46-07:00
-->

# Story: Set Up the Cloudflare App

## Summary

AS a developer
I WANT the app's Cloudflare project, Postgres database and deploy pipeline in place
SO THAT every other story has somewhere to run, in the same platform the steward uses

## Acceptance Criteria

- A Cloudflare project in the account shared with the steward, with production and preview environments.
- A Postgres database reachable from the Worker (for example through Hyperdrive), with migrations checked into the repo and run on deploy.
- Pushing to `main` deploys production; a pull request gets a preview URL.
- Secrets (database URL, later the Anthropic API key) live in Cloudflare secrets, never in the repo.
- The README explains how to run the app locally against a local Postgres and the steward's sample feed (`../daily-help-steward/fixtures/feed-sample/`).
- A test command exists and runs in CI on every pull request.

## Notes

- The steward chose Cloudflare on Oct 25 (steward `docs/CONTEXT.md`, decision 7).
- Open: the framework (it should render on the server in Workers and ship little JavaScript, for weak connections and offline use) and the Postgres host (Neon, Supabase or other).
- The old static site stays live until `3-domain-cutover`.

## Implementation Plan

[to be filled in by /stories plan]
