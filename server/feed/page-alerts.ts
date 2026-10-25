import type { Lang } from '../../app/i18n/index.ts'
import { type AlertView, alertView } from '../../app/lib/alert-view.ts'
import type { Database } from '../db.ts'
import { currentAlerts } from './alerts.ts'
import { currentListings } from './listings.ts'

export interface PageAlerts {
  alerts: AlertView[]
  listingNames: Record<string, string>
  // The title of the first alert naming each listing, for its card and page.
  byListing: Record<string, string>
}

// Alerts never fail a page: if they can't be read, the page shows none and logs why.
export async function pageAlerts(db: Database | null, lang: Lang, now: Date): Promise<PageAlerts> {
  const empty: PageAlerts = { alerts: [], listingNames: {}, byListing: {} }
  if (!db) return empty
  try {
    const alerts = await currentAlerts(db, now)
    if (alerts.length === 0) return empty
    const listingNames = Object.fromEntries((await currentListings(db, now)).map(listing => [listing.id, listing.name]))
    const byListing: Record<string, string> = {}
    for (const alert of alerts) for (const id of alert.listingIds ?? []) byListing[id] ??= alert.title
    return { alerts: alerts.map(alert => alertView(alert, lang)), listingNames, byListing }
  } catch (error) {
    console.error('alerts: could not read current alerts', error)
    return empty
  }
}
