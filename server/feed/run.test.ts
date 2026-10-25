import { afterEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json, sampleListingsFeed } from '../../test/feed.ts'
import { currentListings } from './listings.ts'
import { runIngest } from './run.ts'

describe('runIngest', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does nothing, and says why, without a feed URL or a database', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const open = vi.fn()
    expect(await runIngest({ DATABASE_URL: 'postgres://db' }, { open })).toBeNull()
    expect(await runIngest({ FEED_BASE_URL: 'https://feed.example.org/' }, { open })).toBeNull()
    expect(open).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('refuses a feed URL that is not http(s)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const open = vi.fn()
    expect(await runIngest({ FEED_BASE_URL: 'feed.example.org', DATABASE_URL: 'postgres://db' }, { open })).toBeNull()
    expect(
      await runIngest({ FEED_BASE_URL: 'ftp://feed.example.org/', DATABASE_URL: 'postgres://db' }, { open }),
    ).toBeNull()
    expect(open).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('treats the feed URL as a folder, with or without a trailing slash', async () => {
    const db = await testDatabase()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const host = feedHost(json(sampleListingsFeed()))
    await runIngest(
      { FEED_BASE_URL: 'https://feed.example.org/feed', DATABASE_URL: 'postgres://db' },
      { open: () => ({ db, close: async () => {} }), fetch: host.fetch },
    )
    expect(host.requests[0]?.url).toBe('https://feed.example.org/feed/listings.json')
    await db.close()
  })

  it('logs and resolves, rather than rejecting, when the database fails', async () => {
    const db = await testDatabase()
    await db.close()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const close = vi.fn(async () => {})
    const outcome = await runIngest(
      { FEED_BASE_URL: 'https://feed.example.org/', DATABASE_URL: 'postgres://db' },
      { open: () => ({ db, close }), fetch: feedHost(json(sampleListingsFeed())).fetch },
    )
    expect(outcome).toMatchObject({ result: 'failed' })
    expect(close).toHaveBeenCalledOnce()
  })

  it('refreshes listings.json into the configured database, then closes the connection', async () => {
    const db = await testDatabase()
    const close = vi.fn(async () => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const host = feedHost(json(sampleListingsFeed()))
    const outcome = await runIngest(
      { FEED_BASE_URL: 'https://feed.example.org/feed/', HYPERDRIVE: { connectionString: 'postgres://hyperdrive' } },
      { open: url => (url === 'postgres://hyperdrive' ? { db, close } : expect.fail(url)), fetch: host.fetch },
    )
    expect(outcome).toEqual({ result: 'stored' })
    expect(host.requests[0]?.url).toBe('https://feed.example.org/feed/listings.json')
    expect(await currentListings(db, new Date())).not.toHaveLength(0)
    expect(close).toHaveBeenCalledOnce()
    await db.close()
  })
})
