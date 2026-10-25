import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json, sampleListingsFeed } from '../../test/feed.ts'
import { refreshFeedFile } from './ingest.ts'
import { currentListings, listingsFeedHeader, listingsFile } from './listings.ts'

describe('currentListings', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(() => db.close())

  it('leaves out a listing once its endsAt has passed, even before the next refresh', async () => {
    const feed = sampleListingsFeed()
    const shelter = { ...feed.listings[0], id: 'shelter-tonight', endsAt: '2026-10-26T14:30:00.000Z' }
    const fetch = feedHost(json({ ...feed, listings: [shelter, feed.listings[1]] })).fetch
    await refreshFeedFile(listingsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch,
      now: () => new Date('2026-10-25T18:00:00Z'),
    })

    const ids = async (at: string) => (await currentListings(db, new Date(at))).map(listing => listing.id)
    expect(await ids('2026-10-26T14:29:59Z')).toEqual(['shelter-tonight', feed.listings[1].id])
    expect(await ids('2026-10-26T14:30:00Z')).toEqual([feed.listings[1].id])
  })
})

describe('listingsFeedHeader', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(() => db.close())

  it('is null before any copy has been stored, or without a database', async () => {
    expect(await listingsFeedHeader(db)).toBeNull()
    expect(await listingsFeedHeader(null)).toBeNull()
  })

  it('gives the stored copy’s generatedAt and dataset', async () => {
    const feed = sampleListingsFeed()
    await refreshFeedFile(listingsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(feed)).fetch,
      now: () => new Date(),
    })
    expect(await listingsFeedHeader(db)).toEqual({
      generatedAt: new Date(feed.generatedAt).toISOString(),
      dataset: feed.dataset,
    })
  })

  it('is null, and logs, when the database fails', async () => {
    await db.close()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await listingsFeedHeader(db)).toBeNull()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
