import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { testDatabase } from './db.ts'
import { feedHost, json } from './feed.ts'
import { storeListings } from './listings.ts'
import { LIVE_FEED_DIR, refreshLiveFeed } from './live-feed.ts'

const sample = (name: string) => readFileSync(`test/fixtures/feed-sample/${name}`, 'utf8')
const notFound = () => new Response('not found', { status: 404 })
const now = new Date('2026-10-26T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()

async function snapshotDir(fetchedAt?: string) {
  const dir = join(await mkdtemp(join(tmpdir(), 'feed-live-')), 'feed-live')
  await mkdir(dir)
  await writeFile(join(dir, 'listings.json'), '{"old":true}\n')
  if (fetchedAt) await writeFile(join(dir, 'snapshot.json'), `${JSON.stringify({ fetchedAt })}\n`)
  return dir
}

// The steward answers listings, events (not published), alerts (not published) and pulse, in that order.
const stewardReplies = () => [json(sample('listings.json')), notFound(), notFound(), json(sample('pulse.json'))]

describe('refreshLiveFeed', () => {
  it('leaves a snapshot younger than a day alone, without asking the steward', async () => {
    const dir = await snapshotDir(hoursAgo(23))
    const host = feedHost()
    expect(await refreshLiveFeed({ dir, fetch: host.fetch, now })).toEqual({ result: 'fresh' })
    expect(host.requests).toEqual([])
  })

  it('replaces a snapshot older than a day with the published files and a new timestamp', async () => {
    const dir = await snapshotDir(hoursAgo(25))
    const host = feedHost(...stewardReplies())
    expect(await refreshLiveFeed({ dir, baseUrl: 'https://feed.example.org/feed/', fetch: host.fetch, now })).toEqual({
      result: 'refreshed',
    })
    expect(host.requests.map(request => request.url)).toEqual([
      'https://feed.example.org/feed/listings.json',
      'https://feed.example.org/feed/events.json',
      'https://feed.example.org/feed/alerts.json',
      'https://feed.example.org/feed/pulse.json',
    ])
    expect(JSON.parse(await readFile(join(dir, 'listings.json'), 'utf8'))).toEqual(JSON.parse(sample('listings.json')))
    expect(existsSync(join(dir, 'events.json'))).toBe(false)
    expect(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8'))).toEqual({
      fetchedAt: now.toISOString(),
      from: 'https://feed.example.org/feed/',
    })
    expect(await readFile(join(dir, 'pulse.json'), 'utf8')).toMatch(/\n$/)
  })

  it('takes a snapshot when there is none', async () => {
    const dir = await snapshotDir()
    expect(await refreshLiveFeed({ dir, fetch: feedHost(...stewardReplies()).fetch, now })).toEqual({
      result: 'refreshed',
    })
  })

  it('saves the published pulse weeks beside the pulse', async () => {
    const dir = await snapshotDir()
    const pulse = { ...JSON.parse(sample('pulse.json')), publishedWeeks: [] as unknown[] }
    const week = JSON.parse(sample('weeks/2026-10-19-r1.json'))
    pulse.publishedWeeks = [
      {
        weekStart: week.weekStart,
        revision: week.revision,
        publishedAt: week.publishedAt,
        note: week.note,
        path: 'weeks/2026-10-19-r1.json',
      },
    ]
    const host = feedHost(json(sample('listings.json')), notFound(), notFound(), json(pulse), json(week))
    expect(await refreshLiveFeed({ dir, fetch: host.fetch, now })).toEqual({ result: 'refreshed' })
    expect(JSON.parse(await readFile(join(dir, 'weeks/2026-10-19-r1.json'), 'utf8'))).toEqual(week)
  })

  it('keeps the old snapshot when the steward cannot be reached', async () => {
    const dir = await snapshotDir(hoursAgo(25))
    const outcome = await refreshLiveFeed({ dir, fetch: feedHost(new Error('offline')).fetch, now })
    expect(outcome).toEqual({ result: 'kept', error: expect.stringContaining('offline') })
    expect(await readFile(join(dir, 'listings.json'), 'utf8')).toBe('{"old":true}\n')
    expect(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8'))).toEqual({ fetchedAt: hoursAgo(25) })
  })

  it('keeps the old snapshot when a file does not match the contract', async () => {
    const dir = await snapshotDir(hoursAgo(25))
    const outcome = await refreshLiveFeed({ dir, fetch: feedHost(json({ listings: 'nope' })).fetch, now })
    expect(outcome.result).toBe('kept')
    expect(await readFile(join(dir, 'listings.json'), 'utf8')).toBe('{"old":true}\n')
  })
})

describe('the committed live snapshot', () => {
  it('stores every listing through the ingest', async () => {
    const feed = JSON.parse(readFileSync(join(LIVE_FEED_DIR, 'listings.json'), 'utf8'))
    const db = await testDatabase()
    expect((await storeListings(db, feed)).listings.length).toBeGreaterThan(0)
    await db.close()
  })
})
