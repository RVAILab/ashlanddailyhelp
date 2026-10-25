import { afterEach, describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './locale.tsx'

async function redirected(run: () => Promise<unknown>): Promise<Response> {
  try {
    await run()
  } catch (thrown) {
    if (thrown instanceof Response) return thrown
    throw thrown
  }
  throw new Error('expected a redirect')
}

describe('the language layout', () => {
  const opened: Array<{ close: () => Promise<void> }> = []
  afterEach(async () => {
    await Promise.all(opened.splice(0).map(db => db.close()))
  })

  it('sends a browser that prefers Spanish to the Spanish page, keeping the search', async () => {
    const response = await redirected(() =>
      loader(loaderArgs('/resources?q=comida', {}, { 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.5' })),
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/es/resources?q=comida')
    expect(response.headers.get('Vary')).toBe('Accept-Language, Cookie')
  })

  it('follows a saved choice of Spanish, and a saved choice of English over the browser', async () => {
    const saved = await redirected(() => loader(loaderArgs('/', {}, { Cookie: 'lang=es' })))
    expect(saved.headers.get('Location')).toBe('/es')
    const english = await loader(loaderArgs('/', {}, { Cookie: 'lang=en', 'Accept-Language': 'es' }))
    expect(english.lang).toBe('en')
  })

  it('always shows a /es page in Spanish, whatever the browser or cookie says', async () => {
    const data = await loader(loaderArgs('/es/resources', {}, { Cookie: 'lang=en', 'Accept-Language': 'en' }))
    expect(data.lang).toBe('es')
  })

  it('gives the footer the feed status, with the date in the page’s language', async () => {
    const db = await testDatabase()
    opened.push(db)
    await storeListings(db)
    const english = await loader(loaderArgs('/', { database: () => db }))
    expect(english.feed).toMatchObject({ state: 'stored', asOf: 'Sun, Oct 25, 2026, 12:00 PM PDT' })
    const spanish = await loader(loaderArgs('/es', { database: () => db }))
    expect(spanish.feed).toMatchObject({ state: 'stored', asOf: 'dom, 25 de oct de 2026, 12:00 p.m. PDT' })
  })

  it('still renders the page when opening the database throws', async () => {
    const database = () => {
      throw new Error('Invalid URL')
    }
    const original = console.error
    console.error = () => {}
    try {
      expect((await loader(loaderArgs('/', { database }))).feed).toEqual({ state: 'unavailable' })
    } finally {
      console.error = original
    }
  })
})
