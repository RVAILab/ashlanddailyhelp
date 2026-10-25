<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T12:57:31-07:00
  planned_at:   2026-10-25T12:57:31-07:00
  finished_at:
  updated_at:   2026-10-25T12:57:31-07:00
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

Spanish pages live under `/es` (`/es/resources`), English at the unprefixed URLs, so every link carries its language. A typed message catalog per language (`app/i18n/en.ts` and `es.ts`) holds every interface string; the type checker fails if Spanish lacks a key English has. The root loader works out the language from the URL, and a provider makes it and the catalog available to every component. Dates and times are formatted on the server for the page's language, in Pacific time.

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
