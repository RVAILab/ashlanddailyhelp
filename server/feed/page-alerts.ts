import type { Lang } from '../../app/i18n/index.ts'
import { type AlertView, alertView } from '../../app/lib/alert-view.ts'
import type { Database } from '../db.ts'
import { servesAshland } from '../listings/scope.ts'
import { currentAlerts } from './alerts.ts'
import { feedFileStatus } from './ingest.ts'
import { currentListings } from './listings.ts'

export interface PageAlerts {
  alerts: AlertView[]
  listingNames: Record<string, string>
  // What each named listing's card and page say about its first alert, cancellation included.
  byListing: Record<string, string>
  // Listings an in-effect closure or cancellation shuts, which /today never shows as open.
  closedListings: string[]
  // Events an in-effect closure or cancellation shuts.
  closedEvents: string[]
  demonstration: boolean
  // When the soonest alert ends, so /today can drop it without a reload.
  nextEnd: string | null
}

const empty: PageAlerts = {
  alerts: [],
  listingNames: {},
  byListing: {},
  closedListings: [],
  closedEvents: [],
  demonstration: false,
  nextEnd: null,
}

// An alert shows from a day before it starts, so an urgent one isn't on the page long before it matters.
const LEAD = 24 * 60 * 60 * 1000

// Alerts never fail a page: if they can't be read, the page shows none and logs why.
export async function pageAlerts(db: Database | null, lang: Lang, now: Date): Promise<PageAlerts> {
  if (!db) return empty
  try {
    const alerts = (await currentAlerts(db, now)).filter(
      alert => servesAshland(alert.area, alert.coverage) && Date.parse(alert.startsAt) - LEAD <= now.getTime(),
    )
    if (alerts.length === 0) return empty
    const views = alerts.map(alert => alertView(alert, lang))
    const listingNames = Object.fromEntries((await currentListings(db, now)).map(listing => [listing.id, listing.name]))
    const byListing: Record<string, string> = {}
    alerts.forEach((alert, index) => {
      const status = views[index]?.status
      for (const id of alert.listingIds ?? []) byListing[id] ??= status ? `${alert.title}: ${status}` : alert.title
    })
    const closing = alerts.filter(
      alert =>
        (alert.kind === 'closure' || alert.kind === 'cancellation') &&
        !alert.status &&
        Date.parse(alert.startsAt) <= now.getTime(),
    )
    const closedListings = closing.flatMap(alert => alert.listingIds ?? [])
    const closedEvents = closing.flatMap(alert => alert.eventIds ?? [])
    const file = await feedFileStatus(db, 'alerts.json')
    return {
      alerts: views,
      listingNames,
      byListing,
      closedListings,
      closedEvents,
      demonstration: file?.dataset === 'FICTIONAL_DEMONSTRATION',
      nextEnd: new Date(Math.min(...alerts.map(alert => Date.parse(alert.endsAt)))).toISOString(),
    }
  } catch (error) {
    console.error('alerts: could not read current alerts', error)
    return empty
  }
}
