import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { listingsByProvider } from './providers.ts'

describe('listingsByProvider', () => {
  it('finds a provider’s listings by part of its name, ignoring case, within Ashland', async () => {
    const db = await testDatabase()
    const sample = sampleListingsFeed()
    await storeListings(db, {
      ...sample,
      listings: [
        ...sample.listings,
        { ...sample.listings[0], id: 'ohra-grants-pass', area: 'Grants Pass', coverage: ['Grants Pass'] },
      ],
    })
    const now = new Date('2026-10-25T18:00:00Z')
    const ids = (await listingsByProvider(db, 'ohra', now)).map(listing => listing.id)
    expect(ids).toEqual(expect.arrayContaining(['ohra-showers', 'ohra-navigation', 'ohra-shelter']))
    expect(ids).not.toContain('ohra-grants-pass')
    expect(await listingsByProvider(db, '  ', now)).toEqual([])
    expect(await listingsByProvider(db, '%', now)).toEqual([])
    await db.close()
  })
})
