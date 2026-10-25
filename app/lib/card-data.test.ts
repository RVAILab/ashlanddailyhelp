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
})
