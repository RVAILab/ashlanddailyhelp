<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:57:31-07:00
  planned_at:   2026-10-25T12:57:31-07:00
  finished_at:  2026-10-25T13:40:26-07:00
  updated_at:   2026-10-25T13:40:26-07:00
-->

# Story: Spanish Interface

## Summary

AS a Spanish speaker
I WANT the whole interface in Spanish
SO THAT I can use the app in my language

## Acceptance Criteria

- Every interface string goes through translation keys, with English and Spanish catalogs; no hard-coded copy.
- The language comes from the browser, can be switched on every page, is remembered on the device, and is in the URL (for example `/es/today`) so shared links keep it.
- The page `lang` attribute is set; dates, days and times are formatted for the language, in Pacific time.
- Interface translations, including the evidence wording ("Not confirmed", "Schedule needs checking") and emergency numbers, are reviewed by a Spanish speaker, not machine-only.

## Notes

- Listing text is `11-translate-listings`.

## Implementation Plan

Spanish pages live under `/es` (`/es/resources`), English at the unprefixed URLs, so every link carries its language. A typed message catalog per language (`app/i18n/en.ts` and `es.ts`) holds every interface string; the type checker fails if Spanish lacks a key English has. The language layout (`app/routes/locale.tsx`) works out the language from the URL, and a provider makes it and the catalog available to every component. Dates and times are formatted on the server for the page's language, in Pacific time.

### Steps

1. Routes: wrap the pages in an optional static segment, `route('es?', 'routes/locale.tsx', [...])`, so `/`, `/resources` and the not-found page each exist in both languages; `/health` stays outside.
2. `app/i18n/`: `en.ts` (the type of the catalog), `es.ts` (`satisfies Messages`), `index.ts` (`Lang`, `langFromPath`, `localePath`, `messagesFor`), and `provider.tsx` (`I18nProvider`, `useI18n`). Messages that take values are functions (`places: n => …`), so plurals and word order are each language's own.
3. Move every string out of `root.tsx`, `home.tsx`, `not-found.tsx`, `resources.tsx`, `feed-footer.tsx`, `listing-card.tsx`, `app/lib/categories.ts` and `app/lib/listing-labels.ts` into the catalogs. Formatting functions (`formatAsOf`, `listingLabels`) take the language and use `en-US` or `es-US` with `America/Los_Angeles`.
4. `<html lang>` from the URL (it works on error pages too), `hreflang` alternate links in `meta`, and a language switch on every page: a link to the same page in the other language, labelled in that language ("Español", "English").
5. Remembered on the device: the switch goes through `/language?to=es&return=/resources?q=…`, which sets a `lang` cookie (one year, `SameSite=Lax`) and redirects to the page in the chosen language, validating `return` as a local path.
6. From the browser: on an unprefixed page with no `lang` cookie, an `Accept-Language` that prefers Spanish over English redirects (302, `Vary: Accept-Language, Cookie`) to the `/es` page. With the cookie, the cookie wins. Links and shared URLs with `/es` always open in Spanish.
7. README: how to add a string, and that the Spanish catalog needs review by a Spanish speaker.

### Data model

None. Listing text from the feed stays in English until `11-translate-listings`.

### Tests

- `app/i18n/index.test.ts`: `langFromPath`, `localePath` (adding and removing `/es`, keeping the query string), `preferredLang` (`Accept-Language` with q-values, cookie first).
- `app/i18n/catalog.test.ts`: Spanish has every key, no message is empty, and each function message gives text for sample values.
- `app/routes/language.test.ts`: sets the cookie, redirects to the localized page, refuses an outside `return`.
- Route and component tests in Spanish: the homepage, `/es/resources` (labels, count, empty state), the footer's Spanish date ("dom, 25 oct 2026").
- `e2e/spanish.spec.ts`: a browser preferring Spanish lands on `/es`; the switch goes to English and is remembered on the next visit; `/es/resources?q=…` keeps the search; `<html lang>` matches.

### States and accessibility

- `lang` on `<html>`; the switch link has `lang` and `hreflang` for the other language; no flag icons.
- Error and not-found pages in the URL's language.

### Risks and open questions

- The Spanish catalog is written carefully but not by a native speaker; the "reviewed by a Spanish speaker" criterion stays open until someone reviews `app/i18n/es.ts`.
- Search words in Spanish only match English listing text where they share words, until `11-translate-listings`.

## Review

Reviewed 2026-10-25 at `f187169` by an independent agent (including the Spanish); findings checked and fixed in `e1e0ed8` unless noted.

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Every interface string through translation keys, no hard-coded copy | ✅ | `app/i18n/en.ts` and `es.ts` (`satisfies Messages`); only the never-shown 503 body stays English |
| Language from the browser, switchable, remembered, in the URL | ✅ | `app/i18n/redirect.ts` (on arrival only), `app/routes/language.ts` (cookie), `/es` routes; English reachable without cookies (end-to-end). Server-error pages have no switch. |
| `lang` set; dates and times for the language, Pacific time | ✅ | `<html lang>` from the URL; `formatAsOf` and `listingLabels` per language, on the server; feed text marked `lang="en"` on Spanish pages |
| Translations reviewed by a Spanish speaker | ❌ | Open. The review's wording notes were applied, but that isn't a native review. |

Findings:

1. Fixed: an open redirect in `/language`, since `/.//evil.example` normalizes to `//evil.example`; `localePath` now collapses leading slashes, with tests for each variant.
2. Fixed: crawlers could follow the cookie-setting switch from every page; the link is `nofollow`, `robots.txt` disallows `/language`, and the cookie is `HttpOnly`.
3. Fixed: with cookies blocked, a Spanish-preferring browser could never reach English. The redirect now happens only on arrival from outside the site.
4. Fixed: equal browser rankings chose English; ties now follow the browser's order.
5. Fixed: English listing text on Spanish pages wasn't marked; it now carries `lang="en"`. The English-only "may be canceled" note on Spanish cards is raised for `11-translate-listings`.
6. Fixed: missing tests (revalidation, Spanish not-found, feed text marked English, `/ES`, alternates); the catalog test now calls messages with realistic values.
7. Fixed: hreflang alternates are absolute, with `x-default`.
8. Fixed: a redirect no longer runs the page's database queries (it happens in middleware), and only English pages vary on `Accept-Language` and `Cookie`. Root error pages lose `Vary`, which matters only once HTML is cached.
9. Fixed: `/ES` now goes to `/es`, and `localePath` keeps `#hash`.
10. Fixed: Spanish wording. "Servicios" for listings could read as "the services are closed"; it now says "la lista" or "la información". "Verifique el horario antes de ir" for a conflict; "La organización todavía no lo ha confirmado"; "Regaderas (duchas)"; "No se encontraron lugares"; "Todo el condado de Jackson"; "Información revisada el…"; full day, month and zone names in Spanish dates.
11. Fixed: an unused `pageTitle` message and an area function that ignored its argument; README and CLAUDE.md statements about when the redirect happens and which pages have the footer.

## Learnings

- Went well: an independent review that could read Spanish caught wording that would have told people the services were closed, which no test would.
- Surprising: URL normalization turns a path that passes a "starts with one slash" check into one that leaves the site; validate after normalizing, not before.
- Next time: put redirects that depend on the visitor in middleware from the start, and decide early what "remembered" means for people without cookies.
- Open: the Spanish catalog (`app/i18n/es.ts`) needs a native speaker's review before launch.
