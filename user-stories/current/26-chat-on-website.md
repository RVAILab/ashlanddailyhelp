<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:27:52-07:00
  planned_at:   2026-10-25T16:28:09-07:00
  finished_at:
  updated_at:   2026-10-25T16:28:09-07:00
-->

# Story: Chat on the Website

## Summary

AS someone looking for help
I WANT to ask a question in plain words on the website
SO THAT I get an answer without knowing which category to look in

## Acceptance Criteria

- A chat entry on the homepage and /today that uses `25-chat-grounding`.
- Answers link to the resource pages they cite.
- Usable by keyboard and screen reader; says clearly when it is offline.

## Notes

- Depends on `25-chat-grounding`.

## Implementation Plan

An "Ask a question" page at `/ask` with a plain form that posts to its own action. The action calls `answerQuestion` (story 25) and the page shows the answer, with links to the listings it cites. Posting rather than a GET link means crawlers and link previews never spend model calls. It works without JavaScript, like the other plain pages.

1. **Services** (`app/context.ts`, `workers/app.ts`):
   - `answerer`, a Claude answerer when `ANTHROPIC_API_KEY` is set, otherwise null;
   - `askAllowed(key)`, backed by a Workers rate-limit binding `ASK_LIMIT` (10 a minute per connection, in `wrangler.jsonc`; keyed by `CF-Connecting-IP` and never stored by us).
2. **`app/routes/ask.tsx`** (`handle.hydrate = false`, `noindex`).
   - The GET shows the form, with a label, a 300-character limit and a note that nothing is kept.
   - The POST action trims and checks the question, applies the rate limit, then answers.
   - States:
     - empty question: "Type a question";
     - chat not set up: "Asking isn't available right now. Call 211.";
     - too many questions: "Please wait a minute";
     - answered: the answer paragraphs, the crisis block first when present, "From listings as of …", and each citation as a link to `/resources/:id` with its source site.
   - Offline: the page sits outside the saved pages' search fallback, and the offline notice says asking needs a connection.
3. **Entry points.** An "Ask a question" form (one field and a button posting to `/ask`) on the homepage and on `/today`.
4. **Service worker.** Never answer `/ask` from the device; it goes in `NEVER`, so offline it shows the offline page, which points to 211.

Tests:

- An `ask` action test (`.test.ts`): it answers with the fake answerer; empty questions, an unset answerer and the rate limit each give their own state; nothing is logged.
- An `ask` view test: the answer, the citation links to listing pages, the crisis block first, and the form's label.
- Home and today tests: the ask form is there and posts to `/ask`.
- e2e: ask a question with JavaScript turned off. CI has no key, so the e2e build runs without one and checks the "not available" state.

