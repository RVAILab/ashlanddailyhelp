<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:44:56-07:00
  planned_at:   2026-10-25T16:45:16-07:00
  finished_at:
  updated_at:   2026-10-25T16:45:16-07:00
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

