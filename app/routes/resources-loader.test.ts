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
    expect(data).toMatchObject({ feedLoaded: true, demonstration: true })
  })

  it('answers 503 when there is no database', async () => {
    await expect(loader(loaderArgs('/resources'))).rejects.toMatchObject({ init: { status: 503 } })
  })
})
