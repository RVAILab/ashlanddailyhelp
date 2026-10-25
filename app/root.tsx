import { useSyncExternalStore } from 'react'
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

const OFFLINE_SCRIPT = `(function(){var n=document.getElementById('offline-notice');function u(){if(n)n.hidden=navigator.onLine}u();addEventListener('online',u);addEventListener('offline',u);if('serviceWorker' in navigator&&location.search.indexOf('cleared')<0){navigator.serviceWorker.register('/sw.js');addEventListener('load',function(){navigator.serviceWorker.ready.then(function(r){r.active&&r.active.postMessage('save-pages')})})}})()`

// Online state for hydrated pages; on pages without JavaScript the inline script shows the notice instead.
const subscribeOnline = (change: () => void) => {
  addEventListener('online', change)
  addEventListener('offline', change)
  return () => {
    removeEventListener('online', change)
    removeEventListener('offline', change)
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
  const { pathname, search } = useLocation()
  const locale = useRouteLoaderData<typeof localeLoader>('routes/locale')
  const origin = locale?.origin
  const page = `${pathname}${search}`
  const hydrate = shipsJavaScript(useMatches().map(match => match.handle))
  return (
    <html lang={langFromPath(pathname)} className={locale?.text ? 'text-only' : undefined}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1f5f4a" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
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
        <p id="offline-notice" className="notice offline-notice" hidden={online} suppressHydrationWarning>
          {messagesFor(langFromPath(pathname)).feed.offline}
        </p>
        {children}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string, no data; inline so even pages without JavaScript work offline and say so
          dangerouslySetInnerHTML={{ __html: OFFLINE_SCRIPT }}
        />
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
