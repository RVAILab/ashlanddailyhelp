import { describe, expect, it } from 'vitest'
import type { StoredListing } from '../../server/feed/contract.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { toCard } from './card-data.ts'

const listing = sampleListingsFeed().listings[0] as StoredListing

describe('toCard', () => {
  it('carries the map location to the card for sorting on the device, and nothing when there is none', () => {
    const geo = { lat: 42.19, lng: -122.7, source: 'geocoded' as const, by: 'census:Public_AR_Current' }
    expect(toCard({ ...listing, geo }, 'en').geo).toEqual({ lat: 42.19, lng: -122.7 })
    expect(toCard(listing, 'en')).not.toHaveProperty('geo')
  })

  it('puts a closure alert first among the labels, as a warning', () => {
    const card = toCard(listing, 'en', { alert: 'Closed today for a staff training' })
    expect(card.labels[0]).toEqual({ kind: 'warning', text: 'Closed today for a staff training' })
  })

  it('shows a stored translation of the schedule, marked translated, and the steward’s words otherwise', () => {
    const translated = new Map([[listing.schedule.trim(), 'Martes y jueves']])
    const spanish = toCard(listing, 'es', { translated })
    expect(spanish.schedule).toEqual({ text: 'Martes y jueves', fromFeed: false })
    expect(spanish.translated).toBe(true)
    expect(toCard(listing, 'es').schedule).toEqual({ text: listing.schedule, fromFeed: true })
  })
})
