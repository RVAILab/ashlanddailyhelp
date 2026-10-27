import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json, sampleListingsFeed } from '../../test/feed.ts'
import type { ListingsFile } from './contract.ts'
import { type FeedFileSpec, feedFileStatus, refreshFeedFile } from './ingest.ts'
import { currentListings, listingsFile } from './listings.ts'

type Db = Awaited<ReturnType<typeof testDatabase>>

describe('refreshing listings.json', () => {
  let db: Db
  const baseUrl = 'https://feed.example.org/feed/'
  const now = new Date('2026-10-25T18:00:00Z')
  beforeEach(async () => {
    db = await testDatabase()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(async () => {
    await db.close()
    vi.restoreAllMocks()
  })

  const refresh = (
    fetch: ReturnType<typeof feedHost>['fetch'],
    at = now,
    spec: FeedFileSpec<ListingsFile> = listingsFile,
  ) => refreshFeedFile(spec, { db, baseUrl, fetch, now: () => at, timeoutMs: 50 })
  const storedIds = async () => (await currentListings(db, new Date(0))).map(listing => listing.id)

  it('stores every listing in feed order, with the file header', async () => {
    const feed = sampleListingsFeed()
    const host = feedHost(json(feed, { ETag: '"v1"' }))
    expect(await refresh(host.fetch)).toEqual({ result: 'stored' })
    expect(host.requests[0]?.url).toBe('https://feed.example.org/feed/listings.json')
    expect(await storedIds()).toEqual(feed.listings.map((listing: { id: string }) => listing.id))
    expect(await feedFileStatus(db, 'listings.json')).toMatchObject({
      generatedAt: new Date(feed.generatedAt),
      dataset: 'FICTIONAL_DEMONSTRATION',
      schemaVersion: feed.schemaVersion,
      lastError: null,
    })
  })

  it('keeps every steward field, including the optional ones', async () => {
    const feed = sampleListingsFeed()
    const listing = {
      ...feed.listings[0],
      provenanceLabel: 'Posted by Peace House',
      unconfirmed: true,
      mayBeCanceled: 'May be canceled tonight. Call before traveling.',
      endsAt: '2026-10-26T14:30:00.000Z',
      sourceUrls: ['https://peacehouse.net/', 'https://example.org/'],
      provenance: {
        schedule: [
          {
            sourceType: 'website',
            sourceRef: 'https://peacehouse.net/',
            span: 'Tuesdays',
            observedAt: '2026-10-24T10:00:00Z',
          },
        ],
      },
      lastConfirmed: '2026-10-23T09:00:00Z',
    }
    await refresh(feedHost(json({ ...feed, listings: [listing] })).fetch)
    expect(await currentListings(db, now)).toEqual([listing])
  })

  it('sends no ETag on the first fetch', async () => {
    const host = feedHost(json(sampleListingsFeed()))
    await refresh(host.fetch)
    expect(host.requests[0]?.headers.has('If-None-Match')).toBe(false)
  })

  it('ignores fields it does not know, at any depth, so a newer minor version still loads', async () => {
    const feed = sampleListingsFeed()
    const provenance = {
      name: [
        {
          sourceType: 'website',
          sourceRef: 'https://example.org/',
          span: 'x',
          observedAt: '2026-10-24T10:00:00Z',
          confidence: 0.9,
        },
      ],
    }
    const listings = [{ ...feed.listings[0], somethingNew: 'from 1.9', provenance }]
    expect(await refresh(feedHost(json({ ...feed, schemaVersion: '1.9', listings, extra: true })).fetch)).toEqual({
      result: 'stored',
    })
    const [stored] = await currentListings(db, now)
    const { confidence: _, ...known } = provenance.name[0] ?? {}
    expect(stored).toEqual({ ...feed.listings[0], provenance: { name: [known] } })
  })

  it('still applies the steward’s own checks, such as unique ids', async () => {
    const feed = sampleListingsFeed()
    const outcome = await refresh(feedHost(json({ ...feed, listings: [feed.listings[0], feed.listings[0]] })).fetch)
    expect(outcome).toEqual({ result: 'failed', error: expect.stringMatching(/duplicate listing id/) })
  })

  it('sends the stored ETag and changes nothing on a 304', async () => {
    const feed = sampleListingsFeed()
    await refresh(feedHost(json(feed, { ETag: '"v1"' })).fetch)
    const before = await feedFileStatus(db, 'listings.json')
    const later = new Date('2026-10-25T18:05:00Z')
    const host = feedHost(new Response(null, { status: 304 }))
    expect(await refresh(host.fetch, later)).toEqual({ result: 'unchanged' })
    expect(host.requests[0]?.headers.get('If-None-Match')).toBe('"v1"')
    expect(await storedIds()).toHaveLength(feed.listings.length)
    expect(await feedFileStatus(db, 'listings.json')).toEqual({ ...before, checkedAt: later })
  })

  it('clears a recorded error on a 304, since the stored copy is current', async () => {
    await refresh(feedHost(json(sampleListingsFeed(), { ETag: '"v1"' })).fetch)
    await refresh(feedHost(new Response('nope', { status: 500 })).fetch)
    await refresh(feedHost(new Response(null, { status: 304 })).fetch)
    expect(await feedFileStatus(db, 'listings.json')).toMatchObject({ lastError: null, lastErrorAt: null })
  })

  it('rolls back a store that fails part way, keeping the last good copy', async () => {
    const feed = sampleListingsFeed()
    await refresh(feedHost(json(feed)).fetch)
    const failing: FeedFileSpec<ListingsFile> = {
      ...listingsFile,
      store: async (tx, file) => {
        await listingsFile.store(tx, file)
        throw new Error('disk full')
      },
    }
    const outcome = await refresh(feedHost(json({ ...feed, listings: feed.listings.slice(0, 1) })).fetch, now, failing)
    expect(outcome).toEqual({ result: 'failed', error: 'disk full' })
    expect(await storedIds()).toHaveLength(feed.listings.length)
  })

  it('replaces the stored listings, so listings dropped from the feed disappear', async () => {
    const feed = sampleListingsFeed()
    await refresh(feedHost(json(feed)).fetch)
    await refresh(feedHost(json({ ...feed, listings: feed.listings.slice(1, 3) })).fetch)
    expect(await storedIds()).toEqual(feed.listings.slice(1, 3).map((listing: { id: string }) => listing.id))
  })

  describe('keeps the last good copy and records the error', () => {
    const cases: Array<[string, () => Response | Error, RegExp]> = [
      ['the host cannot be reached', () => new Error('connect ECONNREFUSED'), /ECONNREFUSED/],
      [
        'the host does not answer in time',
        () => new Response(new ReadableStream({ start() {} })),
        /could not read the file/,
      ],
      ['the host answers with an error', () => new Response('nope', { status: 500 }), /HTTP 500/],
      ['the file is not JSON', () => json('{ "listings": [ '), /not valid JSON/],
      [
        'the file fails the contract',
        () => json({ ...sampleListingsFeed(), dataset: 'MADE_UP' }),
        /does not match the feed contract: dataset/,
      ],
      [
        'the major version is unknown',
        () => json({ ...sampleListingsFeed(), schemaVersion: '2.0' }),
        /unknown major version 2\.0/,
      ],
    ]
    it.each(cases)('when %s', async (_, reply, message) => {
      const feed = sampleListingsFeed()
      await refresh(feedHost(json(feed, { ETag: '"v1"' })).fetch)
      const later = new Date('2026-10-25T18:05:00Z')
      const outcome = await refresh(feedHost(reply()).fetch, later)
      expect(outcome).toEqual({ result: 'failed', error: expect.stringMatching(message) })
      expect(await storedIds()).toHaveLength(feed.listings.length)
      expect(await feedFileStatus(db, 'listings.json')).toMatchObject({
        etag: '"v1"',
        generatedAt: new Date(feed.generatedAt),
        lastError: expect.stringMatching(message),
        lastErrorAt: later,
      })
      expect(console.error).toHaveBeenCalled()
    })
  })

  it('keeps the recorded error short however broken the file is', async () => {
    const listings = Array.from({ length: 200 }, () => ({ id: 'BAD ID' }))
    const outcome = await refresh(feedHost(json({ ...sampleListingsFeed(), listings })).fetch)
    expect(outcome.result).toBe('failed')
    expect((await feedFileStatus(db, 'listings.json'))?.lastError?.length).toBeLessThanOrEqual(500)
  })

  it('fails cleanly, without throwing, when the database is down', async () => {
    await db.close()
    expect(await refresh(feedHost(json(sampleListingsFeed())).fetch)).toMatchObject({ result: 'failed' })
  })

  it('records a failure even before any copy has been stored', async () => {
    expect(await refresh(feedHost(new Response('nope', { status: 503 })).fetch)).toMatchObject({ result: 'failed' })
    expect(await feedFileStatus(db, 'listings.json')).toMatchObject({ generatedAt: null, lastError: 'HTTP 503' })
    expect(await storedIds()).toEqual([])
  })

  it('fails, rather than calling it unpublished, when a file it needs answers 404', async () => {
    expect(await refresh(feedHost(new Response('', { status: 404 })).fetch)).toEqual({
      result: 'failed',
      error: 'HTTP 404',
    })
  })

  it('records why when the file can’t be read to the end', async () => {
    const broken = new ReadableStream({ start: controller => controller.error(new Error('connection reset')) })
    const outcome = await refresh(feedHost(new Response(broken)).fetch)
    expect(outcome).toMatchObject({
      result: 'failed',
      error: expect.stringMatching(/^could not read the file: .*reset/),
    })
  })

  it('stores the next good copy after a failure, and clears the error', async () => {
    await refresh(feedHost(new Response('nope', { status: 503 })).fetch)
    await refresh(feedHost(json(sampleListingsFeed())).fetch)
    expect(await feedFileStatus(db, 'listings.json')).toMatchObject({ lastError: null, lastErrorAt: null })
  })
})
