import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './next.tsx'

describe('/next loader', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'))
    db = await testDatabase()
    const sample = sampleListingsFeed()
    const find = (id: string) => sample.listings.find((listing: { id: string }) => listing.id === id)
    await storeListings(db, {
      ...sample,
      listings: [
        {
          ...find('access-pantries'),
          openings: [
            { startsAt: '2026-10-25T13:00:00-07:00', endsAt: '2026-10-25T15:00:00-07:00' },
            { startsAt: '2026-10-26T09:00:00-07:00', endsAt: '2026-10-26T11:00:00-07:00' },
          ],
        },
        {
          ...find('ohra-shelter'),
          address: 'Location not published. Call the provider.',
          openings: [{ startsAt: '2026-10-25T19:00:00-07:00', endsAt: '2026-10-26T07:30:00-07:00' }],
        },
      ],
    })
  })
  afterAll(async () => {
    vi.useRealTimers()
    await db.close()
  })

  it('gives the next meal and the next place to sleep, ready to show', async () => {
    const page = await loader(loaderArgs('/next', { database: () => db }))
    expect(page.workedOut).toContain('11:00 AM on Sun, Oct 25')
    expect(page.meal).toMatchObject({
      name: 'Groceries for the week ahead',
      when: 'Starts at 1:00 PM, until 3:00 PM',
      details: '/resources/access-pantries',
    })
    expect(page.sleep).toMatchObject({
      when: 'Starts at 7:00 PM, until 7:30 AM tomorrow',
      where: 'Location not published. Call the provider.',
      details: '/resources/ohra-shelter',
    })
  })

  it('looks past today when nothing more is open today', async () => {
    vi.setSystemTime(new Date('2026-10-25T23:30:00Z'))
    const page = await loader(loaderArgs('/next', { database: () => db }))
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'))
    expect(page.meal?.when).toBe('Starts tomorrow at 9:00 AM, until 11:00 AM')
  })

  it('says nothing is known, rather than guessing, when there is no database', async () => {
    const page = await loader(loaderArgs('/next'))
    expect(page).toMatchObject({ meal: null, sleep: null })
  })
})

describe('/next loader, later in the week', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'))
    db = await testDatabase()
    const sample = sampleListingsFeed()
    const pantry = sample.listings.find((listing: { id: string }) => listing.id === 'access-pantries')
    await storeListings(db, {
      ...sample,
      listings: [{ ...pantry, openings: [{ startsAt: '2026-10-28T09:00:00-07:00' }] }],
    })
  })
  afterAll(async () => {
    vi.useRealTimers()
    await db.close()
  })

  it('names the weekday, gives no end time it doesn’t know, and says the data is a demonstration', async () => {
    const page = await loader(loaderArgs('/next', { database: () => db }))
    expect(page.meal?.when).toBe('Starts Wednesday at 9:00 AM')
    expect(page.sleep).toBeNull()
    expect(page.demonstration).toBe(true)
  })

  it('in Spanish, spells out the day it was worked out and the weekday', async () => {
    const page = await loader(loaderArgs('/es/next', { database: () => db }))
    expect(page.workedOut).toContain('domingo, 25 de octubre')
    expect(page.meal?.when).toBe('Empieza el miércoles a las 9:00 a.m.')
  })
})

describe('/next loader, open now and events', () => {
  it('says a meal is open now and until when, and links an event only to a stored listing', async () => {
    const { refreshFeedFile } = await import('../../server/feed/ingest.ts')
    const { eventsFile } = await import('../../server/feed/events.ts')
    const { feedHost, json } = await import('../../test/feed.ts')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'))
    const db = await testDatabase()
    const sample = sampleListingsFeed()
    const pantry = sample.listings.find((listing: { id: string }) => listing.id === 'access-pantries')
    await storeListings(db, {
      ...sample,
      listings: [
        { ...pantry, openings: [{ startsAt: '2026-10-25T10:00:00-07:00', endsAt: '2026-10-25T14:00:00-07:00' }] },
      ],
    })
    const supper = {
      id: 'supper-1',
      title: 'Community supper',
      provider: 'A church',
      categories: ['food'],
      description: 'Flyer lists a supper.',
      date: '2026-10-25',
      startsAt: '2026-10-25T17:00:00-07:00',
      endsAt: '2026-10-25T23:00:00-07:00',
      address: '1 Main St, Ashland',
      area: 'Ashland',
      cost: 'Free',
      requirements: 'Not confirmed',
      phone: '541-555-0199',
    }
    const events = {
      schemaVersion: '1.4',
      generatedAt: '2026-10-25T18:00:00Z',
      dataset: 'FICTIONAL_DEMONSTRATION',
      timeZone: 'America/Los_Angeles',
      from: '2026-10-25',
      until: '2026-11-07',
      events: [supper],
    }
    await refreshFeedFile(eventsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(events)).fetch,
      now: () => new Date(),
    })
    const open = await loader(loaderArgs('/next', { database: () => db }))
    expect(open.meal).toMatchObject({ name: pantry.name, when: 'Open now, until 2:00 PM' })
    vi.setSystemTime(new Date('2026-10-25T22:00:00Z'))
    const evening = await loader(loaderArgs('/next', { database: () => db }))
    expect(evening.meal).toMatchObject({ name: 'Community supper', details: null })
    vi.useRealTimers()
    await db.close()
  })
})
