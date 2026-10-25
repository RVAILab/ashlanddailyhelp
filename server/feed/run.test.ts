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
