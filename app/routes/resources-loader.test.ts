import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './resources.tsx'

describe('/resources loader', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storeListings(db)
  })
  afterAll(() => db.close())

  it('searches with the filters in the URL, and gives cards ready to show', async () => {
    const data = await loader(loaderArgs('/resources?q=shower&category=hygiene', { database: () => db }))
    expect(data.filters).toEqual({ query: 'shower', category: 'hygiene' })
    expect(data.results.map(card => card.id)).toEqual(['ohra-showers'])
    expect(data.results[0]).toMatchObject({
      categories: ['Showers and hygiene'],
      labels: expect.arrayContaining([expect.objectContaining({ kind: 'source' })]),
    })
    expect(data.areas[0]).toBe('Ashland')
    expect(data).toMatchObject({ feedLoaded: true, demonstration: true })
  })

  it('matches the area without regard to case, and ignores an area the feed doesn’t name', async () => {
    const lower = await loader(loaderArgs('/resources?area=medford', { database: () => db }))
    expect(lower.filters.area).toBe('Medford')
    expect(lower.results.map(card => card.id)).toContain('rogue-retreat')
    const unknown = await loader(loaderArgs('/resources?area=Atlantis', { database: () => db }))
    expect(unknown.filters).toEqual({})
    expect(unknown.results.length).toBeGreaterThan(1)
  })

  it('answers 503 when there is no database', async () => {
    await expect(loader(loaderArgs('/resources'))).rejects.toMatchObject({ init: { status: 503 } })
  })
})
