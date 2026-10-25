<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:20:25-07:00
  planned_at:   2026-10-25T16:20:50-07:00
  finished_at:
  updated_at:   2026-10-25T16:20:50-07:00
-->

# Story: Grounded Answers from the Directory

## Summary

AS the team building the chat channels
I WANT one answering service that answers only from the stored listings, events and alerts, citing sources
SO THAT every chat channel gives the same accurate, sourced answers

## Acceptance Criteria

- Answers come only from data in Postgres, with the listing and its source for each fact, and "as of" the feed time.
- When it doesn't know, it says so and points to 211; it never guesses hours or eligibility.
- Crisis messages get crisis numbers first.
- Works in English and Spanish.
- No personal details are stored beyond what the channel needs; logs are minimal and time-limited.
- An evaluation set of real questions with expected answers runs before each change.

## Notes

- Decided Oct 25: chat comes after v1. Shared by `26-chat-on-website`, `27-chat-by-sms` and `28-navigator-assistant`.

## Implementation Plan

One server function, `answerQuestion`, finds the listings, events and alerts that match a question in Postgres. It gives only those to Claude, which must answer from them and cite them. Code, not the model, enforces the rules that matter: crisis numbers first, 211 when nothing fits, and citations limited to what was retrieved. Follow the translator's pattern: a small `Answerer` interface, with Claude behind it, and a fake one in tests.

1. **`server/chat/crisis.ts`.** `isCrisis(text)` checks English and Spanish phrases (suicide, self-harm, overdose, danger, abuse). A crisis answer starts with 911, 988 or 541-774-8201, and then still answers the question.
2. **`server/chat/context.ts`.** `gatherContext(db, question, now, lang)`:
   - up to 8 listings from `searchListings`; if the whole question finds too few, it searches word by word and merges the results;
   - current alerts (`pageAlerts`) and the coming week's events, all within scope;
   - the feed's "as of" time.
3. **`server/chat/claude.ts`.** `claudeAnswerer(client)`, using `claude-opus-5-5` with the server-side fallback and low effort, and a zod output of `{ known, answer, cited }`. The system prompt says:
   - use only the facts given, and attribute them ("Their website lists…");
   - never guess hours, eligibility or cost;
   - say "Confirm before you go";
   - keep it short, and answer in the requested language;
   - cite listing ids.
4. **`server/chat/answer.ts`.** `answerQuestion({ db, answerer, question, lang, now })` returns `{ text, citations: [{ id, name, source }], asOf, crisis, known }`.
   - With no matching listings, it answers "not in the directory, call 211" without calling the model.
   - It keeps only citations among the retrieved ids. An answer marked known but citing nothing counts as unknown.
   - If the model fails, it gives the 211 answer and logs the failure.
   - It logs only `{ known, cited, ms, tokens }`, never the question or the answer.
5. **Evaluation.** `eval/chat.json` holds questions with expectations: the listings that must be cited, "unknown, so 211", or "crisis first". `scripts/chat-eval.ts` (`npm run chat:eval`) loads the sample feed into PGlite, runs each question through the real `answerQuestion`, and reports pass or fail. It needs `ANTHROPIC_API_KEY` and costs a few cents a run.

Data model: none. Nothing about a conversation is stored.

Tests (with a fake answerer):

- crisis numbers come first;
- no match means 211, with no model call;
- citations are limited to the retrieved listings;
- known with no citations counts as unknown;
- a model failure means 211;
- the context is in scope and has an "as of" time;
- Spanish wording;
- no question text is logged.

