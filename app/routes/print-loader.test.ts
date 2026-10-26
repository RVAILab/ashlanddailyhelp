import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { alertsFile } from '../../server/feed/alerts.ts'
import { refreshFeedFile } from '../../server/feed/ingest.ts'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json, sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './print.tsx'

type TestDatabase = Awaited<ReturnType<typeof testDatabase>>

// One database for the plain cases; a case that changes the data gets its own.
let shared: TestDatabase

async function load(path: string, cookie = '', setup?: (db: TestDatabase) => Promise<void>) {
  const db = setup ? await testDatabase() : shared
  if (setup) {
    await storeListings(db)
    await setup(db)
  }
  const data = await loader(
    loaderArgs(`https://ashlanddailyhelp.com${path}`, { database: () => db }, { Cookie: cookie }),
  )
  if (setup) await db.close()
  return data
}

describe('/print loader', () => {
  beforeAll(async () => {
    shared = await testDatabase()
    await storeListings(shared)
  })
  afterAll(() => shared.close())

  it('prints a shared or saved list with name, address, phone, hours and requirements', async () => {
    const data = await load('/print?ids=ohra-showers.uncle-foods')
    expect(data.title).toBe('My list')
    expect(data.rows.map(row => row.name)).toEqual(['A shower and a fresh start', 'A seat at the community table'])
    expect(data.rows[0]).toMatchObject({
      phone: '541-631-2235',
      address: expect.any(String),
      hours: expect.any(String),
      requirements: expect.any(String),
    })
    expect(data.backUrl).toBe('https://ashlanddailyhelp.com/list?ids=ohra-showers.uncle-foods')
    expect(data.qr.startsWith('<svg')).toBe(true)
    const saved = await load('/print?list=saved', 'saved=uncle-foods')
    expect(saved.rows.map(row => row.name)).toEqual(['A seat at the community table'])
  })

  it('prints a kind of help, with a link back to that search', async () => {
    const data = await load('/print?category=hygiene')
    expect(data.title).toBe('Showers and hygiene')
    expect(data.rows.map(row => row.name)).toEqual(['A shower and a fresh start'])
    expect(data.backUrl).toBe('https://ashlanddailyhelp.com/resources?category=hygiene')
  })

  it('prints today’s view', async () => {
    const data = await load('/print?view=today')
    expect(data.title).toBe('Open today')
    expect(data.backUrl).toBe('https://ashlanddailyhelp.com/today')
    expect(data.rows.length).toBeGreaterThan(0)
  })

  it('leaves off places an in-effect closure shuts, like the today page', async () => {
    const data = await load('/print?view=today', '', async db => {
      const feed = JSON.parse(readFileSync('test/fixtures/proposed/alerts.json', 'utf8'))
      Object.assign(feed.alerts[1], {
        kind: 'closure',
        startsAt: '2000-01-01T08:00:00-07:00',
        endsAt: '2100-01-01T08:00:00-07:00',
      })
      await refreshFeedFile(alertsFile, {
        db,
        baseUrl: 'https://feed.example.org/',
        fetch: feedHost(json(feed)).fetch,
        now: () => new Date(),
      })
    })
    expect(data.rows.map(row => row.id)).not.toContain('ohra-shelter')
  })

  it('says when the listings are a fictional demonstration', async () => {
    expect((await load('/print?ids=ohra-showers')).demonstration).toBe(true)
  })

  it('prints a schedule that needs checking as such, and unknown values as not confirmed', async () => {
    const data = await load('/print?ids=uncle-foods')
    expect(data.rows[0]?.warnings).toContain('Schedule needs checking')
    const feed = sampleListingsFeed()
    feed.listings[2].requirements = 'Unknown'
    const db = await testDatabase()
    await storeListings(db, feed)
    const unknown = await loader(
      loaderArgs('https://ashlanddailyhelp.com/print?ids=ohra-showers', { database: () => db }),
    )
    await db.close()
    expect(unknown.rows[0]?.requirements).toBe('Not confirmed')
  })
})
