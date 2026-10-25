<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:27:52-07:00
  planned_at:   2026-10-25T16:28:09-07:00
  finished_at:  2026-10-25T16:41:03-07:00
  updated_at:   2026-10-25T16:41:03-07:00
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


## Review

Reviewed 2026-10-25 at `5d6a2c8` plus fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| A chat entry on the homepage and /today using `25-chat-grounding` | ✅ | `AskForm` (`app/components/ask-form.tsx`) on both pages posts to `path('/ask')`, which is `/es/ask` on Spanish pages. `app/routes/ask.tsx` calls `answerQuestion`. |
| Answers link to the resource pages they cite | ✅ | Citations link to `/resources/:listingId`; events with no listing show as text (tested). |
| Usable by keyboard and screen reader; says clearly when offline | ✅ | Labelled field, 48px button, 44px links, tel links for every number. Offline, a sent question gets a page saying asking needs a connection, with 211 and 911 (`askOffline` in `public/sw.js`). Before sending, the note under the form says so. |

These findings were fixed:

- A question sent offline got the browser's error page, or on /today the app's error page. The form now always posts the whole page, and the service worker answers an offline post with a clear page.
- Crisis and service numbers in answers were plain text. They are now tap-to-call links.

Not changed:

- Everyone on one shared connection, such as a shelter's Wi-Fi, shares 10 questions a minute.
- Refreshing the answer page asks again, which counts against the limit.
- Cross-site posts are already refused by React Router's origin check.

## Learnings

- **Went well:** posting the question, with no loader, made "no model call from a crawler" true by construction.
- **Surprising:** a hydrated page turns a form into a client-side fetch, so offline it fails in a different place than on a plain page. `reloadDocument` keeps one behaviour.
- **Next time:** for each form, ask what happens when it is sent offline, on pages with and without JavaScript.
