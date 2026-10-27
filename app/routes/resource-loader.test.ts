import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { alertsFile } from '../../server/feed/alerts.ts'
import { refreshFeedFile } from '../../server/feed/ingest.ts'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader, meta } from './resource.tsx'

describe('/resources/:id loader', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    const sample = (await import('../../test/feed.ts')).sampleListingsFeed()
    await storeListings(db, {
      ...sample,
      listings: [...sample.listings, { ...sample.listings[0], id: 'ended', endsAt: '2026-01-01T00:00:00.000Z' }],
    })
  })
  afterAll(() => db.close())

  const load = (path: string, id: string) => {
    const args = loaderArgs(path, { database: () => db })
    return loader({ ...args, params: { id } })
  }

  it('gives the listing’s page in the URL’s language', async () => {
    const english = await load('/resources/ohra-showers', 'ohra-showers')
    expect(english.data.listing?.name).toBe('A shower and a fresh start')
    expect(english.data.listing?.fields[0]?.label).toBe('Kind of help')
    const spanish = await load('/es/resources/ohra-showers', 'ohra-showers')
    expect(spanish.data.listing?.fields[0]?.label).toBe('Tipo de ayuda')
  })

  it('answers 404 for a listing that is not there, or has ended', async () => {
    for (const id of ['no-such-listing', 'ended']) {
      const missing = await load(`/resources/${id}`, id)
      expect(missing.init?.status).toBe(404)
      expect(missing.data.listing).toBeNull()
    }
  })

  it('says whether the listing is on the visitor’s list', async () => {
    const args = loaderArgs(
      '/resources/ohra-showers',
      { database: () => db },
      { Cookie: 'saved=uncle-foods.ohra-showers' },
    )
    expect((await loader({ ...args, params: { id: 'ohra-showers' } })).data).toMatchObject({ saved: true })
    expect((await load('/resources/ohra-showers', 'ohra-showers')).data).toMatchObject({ saved: false })
  })

  it('puts an alert about the listing first among its labels, as a warning', async () => {
    const feed = JSON.parse(readFileSync('test/fixtures/proposed/alerts.json', 'utf8'))
    Object.assign(feed.alerts[1], { startsAt: '2000-01-01T08:00:00-07:00', endsAt: '2100-01-01T08:00:00-07:00' })
    await refreshFeedFile(alertsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(feed)).fetch,
      now: () => new Date(),
    })
    const { listing } = (await load('/resources/ohra-shelter', 'ohra-shelter')).data
    expect(listing?.labels[0]).toMatchObject({ kind: 'warning', text: expect.stringContaining(feed.alerts[1].title) })
  })

  it('answers 503 when the listings can’t be read', async () => {
    const args = loaderArgs('/resources/ohra-showers')
    await expect(loader({ ...args, params: { id: 'ohra-showers' } })).rejects.toMatchObject({ init: { status: 503 } })
  })
})

describe('/resources/:id title', () => {
  const titleFor = (pathname: string, listing: { name: string } | null) =>
    meta({ loaderData: { listing }, location: { pathname } } as Parameters<typeof meta>[0])

  it('names the listing, or says it is not available, in the page’s language', () => {
    expect(titleFor('/resources/ohra-showers', { name: 'A shower and a fresh start' })).toEqual([
      { title: 'A shower and a fresh start · Ashland Daily Help' },
    ])
    expect(meta({ location: { pathname: '/resources/x' } } as Parameters<typeof meta>[0])).toEqual([
      { title: 'This listing is not available · Ashland Daily Help' },
    ])
    expect(titleFor('/es/resources/gone', null)).toEqual([
      { title: 'Este servicio no está disponible · Ashland Daily Help' },
    ])
  })
})
