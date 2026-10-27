import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { translations } from '../../db/schema.ts'
import { hashText } from '../../server/translate/texts.ts'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader, meta } from './resources.tsx'

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

  it('on a Spanish page, shows the stored Spanish schedule and marks the card translated', async () => {
    const english = 'Website lists Tuesday and Thursday, 10 a.m.–2 p.m. Confirm before visiting.'
    const spanish = 'El sitio web indica martes y jueves, de 10 a.m. a 2 p.m. Confirme antes de ir.'
    await db.insert(translations).values({
      hash: await hashText('es', english),
      lang: 'es',
      english,
      text: spanish,
      model: 'test',
      translatedAt: new Date('2026-10-25T18:00:00Z'),
    })
    const data = await loader(loaderArgs('/es/resources?q=shower', { database: () => db }))
    expect(data.results[0]).toMatchObject({ id: 'ohra-showers', translated: true, schedule: { text: spanish } })
  })

  it('names the search in the page title, so history and tabs tell searches apart', () => {
    const title = (url: string, query?: string) =>
      meta({
        loaderData: { filters: query ? { query } : {} },
        location: { pathname: new URL(url, 'http://localhost').pathname },
      } as unknown as Parameters<typeof meta>[0])[0]?.title
    expect(title('/resources?q=meal', 'meal')).toBe('meal · Find help · Ashland Daily Help')
    expect(title('/resources')).toBe('Find help · Ashland Daily Help')
  })

  it('answers 503 when there is no database', async () => {
    await expect(loader(loaderArgs('/resources'))).rejects.toMatchObject({ init: { status: 503 } })
  })
})
