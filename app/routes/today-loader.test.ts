import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './today.tsx'

describe('/today loader', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T18:00:00Z'))
    db = await testDatabase()
    const sample = sampleListingsFeed()
    const showers = sample.listings.find((listing: { id: string }) => listing.id === 'ohra-showers')
    const pantry = sample.listings.find((listing: { id: string }) => listing.id === 'access-pantries')
    await storeListings(db, {
      ...sample,
      listings: [
        { ...showers, openings: [{ startsAt: '2026-10-25T10:00:00-07:00', endsAt: '2026-10-25T14:00:00-07:00' }] },
        {
          ...pantry,
          openings: [
            {
              startsAt: '2026-10-25T13:00:00-07:00',
              endsAt: '2026-10-25T15:00:00-07:00',
              location: 'Teresa McCormick Center',
            },
          ],
        },
        sample.listings.find((listing: { id: string }) => listing.id === 'uncle-foods'),
      ],
    })
  })
  afterAll(async () => {
    vi.useRealTimers()
    await db.close()
  })

  it('groups the stored listings by today’s windows, with the times to show', async () => {
    const page = await loader(loaderArgs('/today', { database: () => db }))
    expect(page.groups.openNow.map(entry => [entry.card.id, entry.when])).toEqual([
      ['ohra-showers', 'Open until 2:00 PM'],
    ])
    expect(page.groups.later.map(entry => [entry.card.id, entry.when])).toEqual([
      ['access-pantries', 'Opens at 1:00 PM, until 3:00 PM'],
    ])
    expect(page.groups.later[0]?.card.address).toBe('Teresa McCormick Center')
    expect(page.groups.notConfirmed.map(entry => entry.card.id)).toEqual(['uncle-foods'])
    expect(page.workedOut).toBe('11:00 AM')
    expect(page.nextChange).toBe('2026-10-25T20:00:00.000Z')
  })

  it('filters by kind of help', async () => {
    const page = await loader(loaderArgs('/today?category=hygiene', { database: () => db }))
    expect(
      [...page.groups.openNow, ...page.groups.later, ...page.groups.notConfirmed].map(entry => entry.card.id),
    ).toEqual(['ohra-showers'])
  })
})
