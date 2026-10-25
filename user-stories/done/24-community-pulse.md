<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:55:22-07:00
  planned_at:   2026-10-25T15:55:22-07:00
  finished_at:  2026-10-25T16:18:43-07:00
  updated_at:   2026-10-25T16:18:43-07:00
-->

# Story: Community Pulse

## Summary

AS a funder, city or county staff member, or member of the public
I WANT to see how scheduled services went each week (amounts served, unmet need)
SO THAT I understand what the community is providing and where help falls short

## Acceptance Criteria

- A Pulse page built on `pulse.json` for the live week and the frozen `weeks/` files for published weeks, newest first, with correction notes.
- Units are never added together; unknown is never shown as zero; canceled and unknown outcomes never carry an amount.
- A single provider's daily figure under 10 shows as "fewer than 10"; youth-serving providers' single-provider counts never show.
- Fictional data is labelled as fictional everywhere, including any CSV export.
- Every chart state carries a shape and a word; bars use a labelled linear scale from zero.
- The live week is labelled "This week so far. Numbers can change until the week is published."

## Notes

- Decided Oct 25: later, not v1.
- Rules: steward `docs/FEED.md` (`pulse.json` and week files) and `docs/CONTEXT.md` decision 14.

## Implementation Plan

Ingest `pulse.json` and the frozen week files into one `pulse_weeks` table. Turn a week into a view model with pure functions ported from the legacy `core.js` math. Show it on a plain `/pulse` page with CSS bars, plus a CSV export.

1. **Storage** (`db/schema.ts` and migration `0007`). Add `pulse_weeks`: `key` (`live`, or `<weekStart>-r<revision>`), `week_start`, `revision` (null for live), `published_at`, `note`, `dataset`, and `data` (the week's `week`, `events` and `reports`).
2. **Ingest** (`server/feed/pulse.ts`). `pulseFile` reads `pulse.json` loosely, then checks it with the steward's `PulseFeed`. It stores the live row and the `publishedWeeks` list.
   - `refreshPublishedWeeks` then fetches the latest revision of each published week not yet stored. Week files are frozen, so each is fetched once, and checked with `WeekSnapshot`.
   - Run it in `server/feed/run.ts` after alerts. It is optional: a 404 clears the rows.
3. **View model** (`server/pulse/view.ts`). `pulseWeek(data, dataset)` works out:
   - per unit (meals, sessions, encounters), never added together: the total or "not known", the counted and estimated parts, and how many events have an amount;
   - per day and unit: scheduled, reported, the amount or null, and a status with a word and a shape. The statuses are amount reported, partial reporting, amount not recorded, canceled, awaiting a report, and nothing scheduled;
   - "fewer than 10" when a day's amount comes from one provider and is under 10;
   - unmet need: the count of events per reason;
   - a scale: a "nice" maximum from zero for each unit's bars.
4. **Page** (`app/routes/pulse.tsx`, `hydrate: false`, `?week=`).
   - A list of weeks: "This week so far" then the published weeks, newest first, each with its revision and correction note.
   - The fictional label when the dataset is `FICTIONAL_DEMONSTRATION`, and the live label "This week so far. Numbers can change until the week is published."
   - Per unit: the total line, then a list of days with a bar (`role="img"` and a label), the value and the status shape and word, over a labelled axis from 0 to the scale's maximum.
   - Unmet need reasons.
   - A link to the CSV.
5. **CSV** (`app/routes/pulse-csv.ts`, `/pulse.csv?week=`). One row per event, with the dataset in every row and a first row naming it. A single-provider value under 10 reads "fewer than 10".
6. **Links.** Add the page to the homepage's "Other ways in", and to `/about`.

Youth-serving providers: the steward keeps their reports out of `pulse.json` at single-provider level (FEED.md), and the feed has no field to tell them apart. So the site trusts the feed, and the steward is the one place that rule lives.

Tests:

- `server/pulse/view.test.ts`:
  - units are never summed;
  - an unknown amount is never shown as zero;
  - canceled and unknown outcomes carry no amount;
  - "fewer than 10";
  - each status;
  - the scale.
- `server/feed/pulse.test.ts`: stores the live week; fetches each published week once; a 404 clears the rows.
- A loader test and a view test for `/pulse`, and a CSV test with the fictional label.


## Review

Reviewed 2026-10-25 at `043d048` plus fixes. A subagent did an independent read.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Pulse page from `pulse.json` and the frozen `weeks/` files, newest first, with correction notes | ✅ | `server/feed/pulse.ts` (`refreshPublishedWeeks`, `pulseWeeksList` with every revision's note), `app/routes/pulse.tsx` |
| Units never added; unknown never zero; canceled and unknown carry no amount | ✅ | `server/pulse/view.ts`, `view.test.ts`. The CSV leaves unknown values blank. |
| Under 10 shows as "fewer than 10"; youth-serving counts never show | ✅ | Small numbers: see below. Youth-serving: the steward leaves those reports out of `pulse.json` at single-provider level, and the feed can't tell them apart, so the steward is the one place that rule lives. |
| Fictional data labelled everywhere, CSV included | ✅ | The page notice, and `dataset` in every CSV row (`app/routes/pulse-csv.ts`) |
| Every state a shape and a word; bars on a labelled linear scale from zero | ✅ | `SHAPES` and the status words, "Bars run from 0 to N" with the axis, and `niceMax` |
| The live week labelled as such | ✅ | `pulse.tsx` |

These findings were fixed:

- **Small numbers could be worked out by subtraction.** Examples: the week total minus the other days, or the page's day total minus a CSV row. The rule now protects each provider's daily figure.
  - A day or a week that includes a figure under 10 shows only what is certain: "fewer than 10", "at least N" (the larger figures), or "small figures held back".
  - The counted and estimated split is hidden then.
  - The CSV holds back those events.
  - This is stricter than decision 14, which lets weekly totals show. It has to be, or one small figure is always recoverable.
  - A measured zero is a figure under 10 too, so there is no separate "measured zero" status.
- **A correction could make a week disappear.** The old revision was deleted before the new one was fetched. Now it is replaced only after the new revision is stored.
- **A week file wasn't checked against its listing.** A file that isn't the revision listed for it is now refused.
- **Earlier revisions' notes weren't listed.** Every correction note is listed now.
- **Accessibility.** The status shapes are hidden from screen readers. Bars stay visible in forced colours and in print.

## Learnings

- **Went well:** porting the legacy `core.js` math into a pure function kept the steward's contract ("the arrays core.js takes") true and easy to test.
- **Surprising:** a "fewer than 10" rule applied to one number isn't a rule at all once totals, splits and exports sit next to it. Small-number protection has to be about what can be derived, not what is displayed.
- **Next time:** for any privacy threshold, list every place the protected figure feeds into (totals, splits, scales, exports) and test subtraction across them.
