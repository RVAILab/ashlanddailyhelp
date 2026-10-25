import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
  useRouteLoaderData,
} from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { langFromPath, langs, localePath, messagesFor } from './i18n/index.ts'
import type { loader as localeLoader } from './routes/locale.tsx'

// A page made only of links and text sets handle = { hydrate: false } and ships no JavaScript at all.
export const shipsJavaScript = (handles: unknown[]) => handles.every(handle => !hasHydrateFalse(handle))

const hasHydrateFalse = (handle: unknown) =>
  typeof handle === 'object' && handle !== null && 'hydrate' in handle && handle.hydrate === false

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation()
  const origin = useRouteLoaderData<typeof localeLoader>('routes/locale')?.origin
  const page = `${pathname}${search}`
  const hydrate = shipsJavaScript(useMatches().map(match => match.handle))
  return (
    <html lang={langFromPath(pathname)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        {origin && (
          <>
            {langs.map(lang => (
              <link key={lang} rel="alternate" hrefLang={lang} href={`${origin}${localePath(page, lang)}`} />
            ))}
            <link rel="alternate" hrefLang="x-default" href={`${origin}${localePath(page, 'en')}`} />
          </>
        )}
        <Links />
      </head>
      <body>
        {children}
        {hydrate && (
          <>
            <ScrollRestoration />
            <Scripts />
          </>
        )}
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const lang = langFromPath(useLocation().pathname)
  const t = messagesFor(lang).errors
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main>
      <h1>{notFound ? t.notFound : t.failed}</h1>
      <p>
        {notFound ? t.notFoundDetail : t.failedDetail} <a href={localePath('/', lang)}>{t.home}</a>. {t.call211}{' '}
        <a href="tel:211">211</a>.
      </p>
    </main>
  )
}
