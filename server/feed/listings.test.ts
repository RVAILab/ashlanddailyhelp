import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json, sampleListingsFeed } from '../../test/feed.ts'
import { refreshFeedFile } from './ingest.ts'
import { currentListings, listingsFeedStatus, listingsFile } from './listings.ts'

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

describe('listingsFeedStatus', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  const at = new Date('2026-10-25T18:00:00Z')
  const refresh = (reply: Response) =>
    refreshFeedFile(listingsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(reply).fetch,
      now: () => at,
    })
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(() => db.close())

  it('is unavailable without a database', async () => {
    expect(await listingsFeedStatus(null)).toEqual({ state: 'unavailable' })
  })

  it('is none before any copy has been stored', async () => {
    expect(await listingsFeedStatus(db)).toEqual({ state: 'none' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await refresh(new Response('nope', { status: 503 }))
    expect(await listingsFeedStatus(db)).toEqual({ state: 'none' })
    vi.restoreAllMocks()
  })

  it('gives the stored copy’s generatedAt and dataset', async () => {
    const feed = sampleListingsFeed()
    await refresh(json(feed))
    expect(await listingsFeedStatus(db)).toEqual({
      state: 'stored',
      generatedAt: new Date(feed.generatedAt).toISOString(),
      dataset: feed.dataset,
      updateFailing: false,
    })
  })

  it('says when the latest update failed, so the copy may be out of date', async () => {
    await refresh(json(sampleListingsFeed()))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await refresh(new Response('nope', { status: 500 }))
    vi.restoreAllMocks()
    expect(await listingsFeedStatus(db)).toMatchObject({ state: 'stored', updateFailing: true })
  })

  it('is unavailable, and logs, when the database fails or is too slow', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const slow = { ...db, select: () => new Promise(() => {}) } as unknown as typeof db
    expect(await listingsFeedStatus(slow, 20)).toEqual({ state: 'unavailable' })
    await db.close()
    expect(await listingsFeedStatus(db)).toEqual({ state: 'unavailable' })
    expect(error).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })
})
