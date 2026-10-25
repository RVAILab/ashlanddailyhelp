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
          openings: [{ startsAt: '2026-10-25T13:00:00-07:00', endsAt: '2026-10-25T15:00:00-07:00' }],
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

  it('says nothing is known, rather than guessing, when there is no database', async () => {
    const page = await loader(loaderArgs('/next'))
    expect(page).toMatchObject({ meal: null, sleep: null })
  })
})
