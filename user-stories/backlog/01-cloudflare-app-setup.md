<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T11:35:21-07:00
-->

# Story: Set Up the Cloudflare App

## Summary

AS a developer
I WANT the app's Cloudflare project, Postgres database and deploy pipeline in place
SO THAT every other story has somewhere to run, in the same platform the steward uses

## Acceptance Criteria

- Done in PR #2: a Cloudflare Worker (`ashlanddailyhelp`, `wrangler.jsonc`, `worker.js`) serving the repo's static files at <https://ashlanddailyhelp.kitchenlab.workers.dev>.
- Done in PR #2: pushing to `main` deploys production through GitHub Actions (`.github/workflows/deploy.yml`), and pull requests run the checks without deploying.
- The Worker's Cloudflare account is confirmed as the one shared with the steward, or the Worker moves there.
- A Postgres database reachable from the Worker (for example through Hyperdrive), with migrations checked into the repo and run on deploy.
- A pull request gets a preview URL (`preview_urls` is `false` today).
- The workflow builds the new app before deploying; today it serves files as committed, with no build step.
- Secrets (database URL, later the Anthropic API key) live in Cloudflare secrets, never in the repo. The deploy token stays in GitHub secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- The README explains how to run the app locally against a local Postgres and the steward's sample feed (`../daily-help-steward/fixtures/feed-sample/`).
- A test command runs in CI on every pull request, in place of today's `node --check` and `wrangler deploy --dry-run` checks or alongside them.

## Notes

- The steward chose Cloudflare on Oct 25 (steward `docs/CONTEXT.md`, decision 7).
- PR #2 (`a8845c3`) deployed the old static site to Cloudflare; this story turns that project into the new app's.
- Decided Oct 25: a TypeScript server on Workers, a React and TypeScript client, and Postgres (CLAUDE.md, "The new app").
- Open: the framework (it should render React on the server in Workers and ship little JavaScript, for weak connections and offline use), the Postgres host (Neon, Supabase or other), the migration tool, and the test tools. Record the choices in CLAUDE.md.
- The old static site stays live until `18-domain-cutover`.

## Implementation Plan

[to be filled in by /stories plan]
