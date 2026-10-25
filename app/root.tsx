import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { listingsFeedHeader } from '../server/feed/listings.ts'
import type { Route } from './+types/root'
import './app.css'
import { FeedFooter } from './components/feed-footer.tsx'
import { services } from './context.ts'

export async function loader({ context }: Route.LoaderArgs) {
  return { feed: await listingsFeedHeader(context.get(services).database()) }
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
        {notFound ? 'There is no page at this address.' : 'Please try again.'} <a href="/">Go to the homepage</a>.
      </p>
    </main>
  )
}
