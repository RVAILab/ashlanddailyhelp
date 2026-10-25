import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './offline-pages.ts'

describe('/offline-pages.json', () => {
  it('lists the pages to keep on the device: the main ones and every current listing', async () => {
    const db = await testDatabase()
    const feed = await storeListings(db)
    const response = await loader(loaderArgs('/offline-pages.json', { database: () => db }))
    const pages: string[] = await response.json()
    expect(pages.slice(0, 4)).toEqual(['/', '/today', '/resources', '/about'])
    expect(pages).toContain(`/resources/${feed.listings[0].id}`)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await db.close()
  })

  it('lists only the main pages without a database', async () => {
    const response = await loader(loaderArgs('/offline-pages.json'))
    expect(await response.json()).toEqual(['/', '/today', '/resources', '/about'])
  })
})
