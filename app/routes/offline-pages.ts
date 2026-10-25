import { currentListings } from '../../server/feed/listings.ts'
import { services } from '../context.ts'
import type { Route } from './+types/offline-pages'

const MAIN = ['/', '/today', '/resources', '/about']

// The pages the service worker keeps on the device after it installs.
export async function loader({ context }: Route.LoaderArgs) {
  let pages = MAIN
  try {
    const db = context.get(services).database()
    if (db) pages = [...MAIN, ...(await currentListings(db, new Date())).map(listing => `/resources/${listing.id}`)]
  } catch (error) {
    console.error('offline: could not list the listing pages', error)
  }
  return Response.json(pages, { headers: { 'Cache-Control': 'no-store' } })
}
