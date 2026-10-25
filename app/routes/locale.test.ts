import { afterEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader, middleware, shouldRevalidate } from './locale.tsx'

const run = async (path: string, headers: HeadersInit = {}, provided = {}) =>
  (await loader(loaderArgs(path, provided, headers))).data

describe('the language layout', () => {
  const opened: Array<{ close: () => Promise<void> }> = []
  afterEach(async () => {
    await Promise.all(opened.splice(0).map(db => db.close()))
    vi.restoreAllMocks()
  })

  it('redirects before any page loader runs, with Vary, when the visitor prefers the other language', async () => {
    const [redirectFirst] = middleware
    const args = loaderArgs('/resources?q=comida', {}, { 'Accept-Language': 'es' })
    let thrown: unknown
    try {
      await redirectFirst?.(args, async () => new Response())
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).headers.get('Location')).toBe('/es/resources?q=comida')
    expect((thrown as Response).headers.get('Vary')).toBe('Accept-Language, Cookie')
  })

  it('takes the language from the URL, and varies only English pages on the visitor’s preferences', async () => {
    const english = await loader(loaderArgs('/', {}, { Cookie: 'lang=en' }))
    expect(english.data.lang).toBe('en')
    expect(new Headers(english.init?.headers).get('Vary')).toBe('Accept-Language, Cookie')
    const spanish = await loader(loaderArgs('/es/resources', {}, { Cookie: 'lang=en' }))
    expect(spanish.data.lang).toBe('es')
    expect(new Headers(spanish.init?.headers).get('Vary')).toBeNull()
  })

  it('gives the footer the feed status, with the date in the page’s language', async () => {
    const db = await testDatabase()
    opened.push(db)
    await storeListings(db)
    expect((await run('/', {}, { database: () => db })).feed).toMatchObject({
      state: 'stored',
      asOf: 'Sun, Oct 25, 2026, 12:00 PM PDT',
    })
    expect((await run('/es', {}, { database: () => db })).feed).toMatchObject({
      state: 'stored',
      asOf: 'domingo, 25 de octubre de 2026, 12:00 p.m. hora de verano del Pacífico',
    })
  })

  it('still renders the page when opening the database throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const database = () => {
      throw new Error('Invalid URL')
    }
    expect((await run('/', {}, { database })).feed).toEqual({ state: 'unavailable' })
  })

  it('reloads when the language changes, and not for other navigation', () => {
    const at = (path: string) => new URL(path, 'https://ashlanddailyhelp.com')
    const args = {
      defaultShouldRevalidate: true,
      currentUrl: at('/resources'),
      nextUrl: at('/resources?q=x'),
    } as Parameters<typeof shouldRevalidate>[0]
    expect(shouldRevalidate(args)).toBe(false)
    expect(shouldRevalidate({ ...args, nextUrl: at('/es/resources') })).toBe(true)
    expect(shouldRevalidate({ ...args, formMethod: 'POST' })).toBe(true)
  })
})
