<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:44:56-07:00
  planned_at:   2026-10-25T16:45:16-07:00
  finished_at:  2026-10-25T16:52:19-07:00
  updated_at:   2026-10-25T16:52:19-07:00
-->

# Story: Navigator Assistant

## Summary

AS a caseworker or outreach worker
I WANT an assistant that answers detailed questions about eligibility, requirements and schedules and builds lists
SO THAT I can help more people, faster

## Acceptance Criteria

- Uses `25-chat-grounding`, with fuller answers and every source shown.
- Can turn an answer into a shareable list or handout (`17-shareable-lists`, `18-print-handout`).
- Access approach decided (open, or limited to known navigators) without adding accounts to the public site.

## Notes

- Depends on `25-chat-grounding`.

## Implementation Plan

A `/navigator` page for caseworkers and outreach workers, built like `/ask` (story 26). It uses the same answering service (story 25) at a "full" depth, and turns the answer's listings into a shareable list, a printable handout or the device's saved list.

Access, decided Oct 25: open, with no accounts. Every listing is already public, the page adds no private data, and the per-connection rate limit applies. It is linked from `/providers` and `/about` rather than the homepage. If abuse or cost becomes a problem, a shared passphrase in a Worker secret can be added without accounts.

1. **`server/chat/answer.ts` and `claude.ts`.** `answerQuestion({ ..., depth: 'brief' | 'full' })`. At full depth it retrieves up to 12 listings and passes `detail: 'full'`; the prompt then asks for eligibility, requirements, schedule, cost and access for each relevant entry, each attributed, in up to ten sentences, listing every relevant entry. The brief depth is unchanged.
2. **`app/components/chat-answer.tsx`.** Move the answer view (paragraphs, tap-to-call numbers, citations with their sources, "as of") out of `ask.tsx`, so both pages share it. At full depth every citation shows its source link.
3. **`app/routes/navigator.tsx`** (`hydrate: false`, `noindex`, POST with the ask form, the same states). Under an answer that cites listings:
   - "Open as a shareable list" (`/list?ids=`);
   - "Print a handout" (`/print?ids=`);
   - "Save these to my list" (`/list/save?ids=`).
4. **Links** from `/providers` and `/about`. Add `/navigator` to the service worker's `NEVER` list.
5. **Eval.** Add two full-depth cases to `eval/chat.json` (`"depth": "full"`): requirements for the food pantry, and the shelter's eligibility. Each must cite its listing and keep the time check.

Tests:

- `answer.test.ts`: full depth passes `detail: 'full'` and allows 12 listings.
- A `navigator` action test: answers at full depth.
- A `navigator` view test: the list, print and save links carry the cited ids; sources show.
- The ask view test still passes with the shared component.


## Review

Reviewed 2026-10-25 at `a33d7cc` plus fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Uses `25-chat-grounding`, with fuller answers and every source shown | ✅ | `answerQuestion({ depth: 'full' })`: 12 listings and the full-detail prompt. The ids check is unchanged. Each citation links to its listing page and to its source site (`app/components/chat-answer.tsx`). Two full-depth eval cases pass (13 of 13). |
| Can turn an answer into a shareable list or handout | ✅ | `app/routes/navigator.tsx`: "Open as a shareable list", "Print a handout" and "Save these to my list", with the cited listing ids (tested). |
| Access decided without accounts | ✅ | Open, `noindex`, rate-limited, and linked from /providers and /about. A passphrase in a Worker secret is the fallback if abuse appears. |

These findings were fixed:

- Sources showed as plain site names. They now link to the source (in a new tab, as the link says).
- `/list/save` merged lists without the 30-listing cap, so a nearly full list silently dropped the new ones. It now keeps the newest, as one-at-a-time saving does. This was there before, but this page made it likelier.

Not changed:

- `/list/save` redirects to the English `/list`.
- At full depth, only the eval guards against the model filling in details from the wording. The time-of-day check covers the riskiest kind.

## Learnings

- **Went well:** the refactor before the feature (a shared action and answer view) left the navigator page as little more than a depth setting and three links.
- **Surprising:** a cap enforced when reading (`savedIds` keeps the first 30) hides a missing cap when writing, and drops the wrong end.
- **Next time:** enforce limits where data is written, not only where it is read.
