<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T15:55:22-07:00
  planned_at:   2026-10-25T15:55:22-07:00
  finished_at:
  updated_at:   2026-10-25T15:55:22-07:00
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

