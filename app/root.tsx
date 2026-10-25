import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldRevalidateFunctionArgs,
} from 'react-router'
import { type FeedStatus, listingsFeedStatus } from '../server/feed/listings.ts'
import type { Route } from './+types/root'
import './app.css'
import { FeedFooter, type FooterFeed } from './components/feed-footer.tsx'
import { services } from './context.ts'
import { formatAsOf } from './lib/format.ts'

function forFooter(status: FeedStatus): FooterFeed {
  return status.state === 'stored' ? { ...status, asOf: formatAsOf(status.generatedAt) } : status
}

export async function loader({ context }: Route.LoaderArgs) {
  let status: FeedStatus
  try {
    status = await listingsFeedStatus(context.get(services).database())
  } catch (error) {
    console.error('root: could not open the database', error)
    status = { state: 'unavailable' }
  }
  return { feed: forFooter(status) }
}

export function shouldRevalidate({ formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  return formMethod !== undefined && formMethod !== 'GET' ? defaultShouldRevalidate : false
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Outlet />
      <FeedFooter feed={loaderData.feed} />
    </>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main>
      <h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p>
        {notFound ? 'There is no page at this address.' : 'Please try again.'} <a href="/">Go to the homepage</a>. For
        help finding services, call <a href="tel:211">211</a>.
      </p>
    </main>
  )
}
