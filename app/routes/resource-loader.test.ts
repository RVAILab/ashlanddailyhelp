import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './resource.tsx'

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
})
