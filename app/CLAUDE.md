# The React app

React Router 8 in framework mode. Routes are listed in `app/routes.ts`; route modules live in `app/routes/`. Loaders read per-request services (the database) with `context.get(services)` (`app/context.ts`), put there by `workers/app.ts`.

## Keep the browser bundle light

Pages are rendered on the server for old phones and weak connections.

- Work out card and listing-page text on the server (`app/lib/listing-labels.ts`, `app/lib/listing-detail.ts`) and pass it to components, so the page and hydration agree. `listing-detail.ts` also keeps sensitive locations off maps and non-web addresses out of links; build on it rather than formatting feed fields in components.
- Keep zod and other server code out of route components and anything they import.
- Pages made only of links and text export `handle = { hydrate: false }` and ship no JavaScript.

## Languages

Every page exists in English (unprefixed) and Spanish (`/es`), through the optional `es?` segment in `app/routes.ts` and the layout `app/routes/locale.tsx`. `/health` and `/language` sit outside it.

- Never hard-code interface text. Add it to both `app/i18n/en.ts` and `app/i18n/es.ts` (the type checker fails if Spanish lacks a key), in real Spanish; the catalog still awaits a native speaker's review, so say in the commit which strings are new.
- Read strings with `useI18n()` in components (which also gives `path()` for links in the current language), or `messagesFor(langFromPath(...))` in loaders and `meta`.
- Format dates and times on the server with the language (`locales[lang]`, Pacific time).
- Text from the feed is English until a translation exists, so on pages in another language mark it `lang="en"` (see `ListingCardView`, and `fromFeed` on labels and listing-page fields).

## Offline

`public/sw.js` saves pages network-first and hashed assets once. Paths that must never be answered from the device are listed in `NEVER`; add new form posts, API paths and checks there. Bump the cache names (`daily-help-pages-v2`, `daily-help-assets-v2`) when saved copies would no longer be valid, and update the e2e specs that name them.

## Tests

`*.test.tsx` run in happy-dom with Testing Library; find elements by role and label. Route loaders are called with `test/route.ts`.
