<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T13:47:32-07:00
  planned_at:   2026-10-25T13:47:32-07:00
  finished_at:  2026-10-25T14:09:30-07:00
  updated_at:   2026-10-25T14:09:30-07:00
-->

# Story: Homepage

## Summary

AS someone looking for help, or someone helping them
I WANT the homepage to show the fastest way to food, shelter, showers and health care
SO THAT I can find help in a few taps on any phone

## Acceptance Criteria

- Active alerts, if any, appear first, then a link to /today and large entries for each category (food, housing, hygiene, health, essentials). (Alerts arrive with `14-today-alerts` and the /today link with `12-today-open-now`; this story leaves room for both.)
- Emergency and crisis numbers (911, 988, 211) are visible without scrolling or tapping.
- Smaller, clearly labelled ways in for navigators (lists and printing), providers (check your listing) and the public and funders (about).
- Shows "as of" the feed's time, and says so when the data is `FICTIONAL_DEMONSTRATION`.
- Works at 320px wide with one hand: touch targets at least 44px, usable by keyboard and screen reader.
- Has a page-weight budget for first load (for example under 100 KB before images); images and motion are progressive enhancement, gated on `prefers-reduced-motion` and Save-Data.
- Available in English and Spanish.

## Notes

- Audiences decided Oct 25: people seeking help first, then navigators, providers and funders.

## Implementation Plan

A homepage for someone on an old phone: emergency numbers first, then one large entry per kind of help leading into search, then smaller ways in for people helping someone else, providers, and the public. It is plain HTML and CSS with no JavaScript, so its first load stays far under budget; the interactive pages still hydrate. An About page gives providers and funders somewhere real to go.

### Steps

1. `app/root.tsx`: render `<Scripts />` unless the page's route says `handle: { hydrate: false }`, so a page made only of links and text ships no JavaScript.
2. `app/routes/home.tsx` (`hydrate: false`): the emergency strip (911, 988, 211, each a 44px tap-to-call link with what it is for); a heading and one line on what the site is; the five kinds of help as large links to `/resources?category=…`, plus "Search everything"; and "Other ways in": helping someone else (search, for now), running a service (About, providers), about Daily Help.
3. `app/routes/about.tsx` (`hydrate: false`, `/about` and `/es/about`): what Daily Help is, where listings come from (the steward, providers' own pages, the county packet), what the evidence labels mean, that nothing is stored about visitors, a section for providers (how listings are found; a way to check and correct a listing is coming), and the demonstration note while the data is a demonstration.
4. Catalog strings in English and Spanish; styles for the strip, the category grid and the page at 320px.
5. Record in `12-today-open-now` that it adds the homepage's /today link.

### Data model

None.

### Tests

- `app/routes/home.test.tsx`: the emergency links come first and dial the right numbers, the five categories link to search, the ways in are there, in English and Spanish.
- `app/routes/about.test.tsx`: headings and the providers section, both languages.
- `app/root.test.tsx` or an end-to-end check: no `<script>` on the homepage; scripts on `/resources`.
- `e2e/home.spec.ts`: at 320px wide, the emergency numbers are on screen without scrolling; every link on the page is at least 44px tall; the first load of `/` transfers under 100 KB; keyboard order starts at the emergency strip.

### States and accessibility

- The page has no loading or empty states of its own; the footer carries "as of", the demonstration note, and "not loaded" or "unavailable".
- One `h1`; the emergency strip is a labelled navigation region; category links have visible text, not only icons; no motion or images, so nothing to gate on `prefers-reduced-motion` or Save-Data yet.

### Risks and open questions

- Without JavaScript, links from the homepage are full page loads; that is the point for the first visit, and later pages hydrate.
- The wording of the crisis lines (988 for a mental-health or suicide crisis) should be checked against how 988 and 211 describe themselves.

## Review

Reviewed 2026-10-25 at `3c9c02a` by an independent agent; findings fixed in the next commit unless noted.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Alerts first, then /today, then the kinds of help | ⚠️ | Kinds of help built; alerts (`14-today-alerts`) and the /today link (`12-today-open-now`) come with those stories |
| 911, 988, 211 visible without scrolling | ✅ | `e2e/home.spec.ts` at 320×568 |
| Ways in for navigators, providers, the public | ⚠️ | Links exist; sharing and printing come with `17-shareable-lists` and `18-print-handout`, checking a listing with `16-provider-listing-view` |
| "As of" and demonstration note | ✅ | Server-rendered footer |
| 320px, 44px targets, keyboard and screen reader | ✅ | End-to-end checks for size, scroll and keyboard; a real screen-reader pass is still a manual check |
| Under 100 KB first load | ✅ | About 7 KB, no scripts (end-to-end, bytes counted after every response) |
| English and Spanish | ✅ | Both; Spanish polish deferred, as asked |

Fixed: the About page overstated human review, missed sources (city alerts, flyers) and the freshness reason for "not yet confirmed", and said nothing is kept although Cloudflare logs requests; 988 is now "Suicide and crisis line, call or text"; emergency links read "Call 911 …"; the heading is shorter, so a kind of help shows on the first screen; the byte count waits for every response; the no-JavaScript switch has a unit test; the size check covers every link. Left: CSS specificity warnings, the favicon 404, and the Spanish wording notes (polish deferred).

## Learnings

- Went well: rendering the homepage with no JavaScript met the budget by a wide margin without compromising the interactive pages.
- Surprising: the riskiest text on a static page was the About page's claims; it said more about review and privacy than the systems do.
- Next time: check every claim about another system against that system's own docs before writing it.
