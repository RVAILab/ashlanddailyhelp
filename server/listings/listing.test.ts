import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { findListing } from './listing.ts'

const now = new Date('2026-10-25T18:00:00Z')

describe('findListing', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    const sample = sampleListingsFeed()
    await storeListings(db, {
      ...sample,
      listings: [...sample.listings, { ...sample.listings[0], id: 'ended', endsAt: '2026-10-25T17:00:00.000Z' }],
    })
  })
  afterAll(() => db.close())

  it('finds a current listing by id', async () => {
    expect((await findListing(db, 'ohra-showers', now))?.name).toBe('A shower and a fresh start')
  })

  it('finds nothing for an unknown id, or a listing that has ended', async () => {
    expect(await findListing(db, 'no-such-listing', now)).toBeNull()
    expect(await findListing(db, 'ended', now)).toBeNull()
    expect(await findListing(db, 'ended', new Date('2026-10-25T16:00:00Z'))).not.toBeNull()
  })
})
