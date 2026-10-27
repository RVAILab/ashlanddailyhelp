import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './list.tsx'

async function load(path: string, cookie = '') {
  const db = await testDatabase()
  await storeListings(db)
  const data = await loader(
    loaderArgs(`https://ashlanddailyhelp.com${path}`, { database: () => db }, { Cookie: cookie }),
  )
  await db.close()
  return data
}

describe('/list loader', () => {
  it('gives the saved list with current details, in the saved order, and a short link to share it', async () => {
    const data = await load('/list', 'saved=ohra-showers.uncle-foods')
    expect(data.shared).toBe(false)
    expect(data.cards.map(card => [card.id, card.saved])).toEqual([
      ['ohra-showers', true],
      ['uncle-foods', true],
    ])
    expect(data.shareUrl).toBe('https://ashlanddailyhelp.com/list?ids=ohra-showers.uncle-foods')
  })

  it('opens a shared list and counts listings that are no longer there', async () => {
    const data = await load('/list?ids=ohra-showers,gone-away')
    expect(data).toMatchObject({ shared: true, missing: 1, presentIds: ['ohra-showers'] })
    expect(data.cards[0]?.saved).toBe(false)
  })

  it('counts every saved listing as missing, with nothing to share, when the listings can’t be read', async () => {
    const data = await loader(loaderArgs('https://ashlanddailyhelp.com/list', {}, { Cookie: 'saved=ohra-showers' }))
    expect(data).toMatchObject({ cards: [], missing: 1, presentIds: [], shareUrl: null })
  })
})
