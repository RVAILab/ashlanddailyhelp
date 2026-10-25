import { afterEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../test/db.ts'
import { loaderArgs } from '../test/route.ts'
import { loader, shouldRevalidate } from './root.tsx'

describe('root loader', () => {
  afterEach(() => vi.restoreAllMocks())

  it('gives every page the listings feed status from the database', async () => {
    const db = await testDatabase()
    expect(await loader(loaderArgs('/', { database: () => db }))).toEqual({ feed: { state: 'none' } })
    await db.close()
  })

  it('still renders the page when opening the database throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const database = () => {
      throw new Error('Invalid URL')
    }
    expect(await loader(loaderArgs('/', { database }))).toEqual({ feed: { state: 'unavailable' } })
  })

  it('is not reloaded when only the URL changes, since the feed status changes on its own schedule', () => {
    const args = { defaultShouldRevalidate: true } as Parameters<typeof shouldRevalidate>[0]
    expect(shouldRevalidate(args)).toBe(false)
    expect(shouldRevalidate({ ...args, formMethod: 'POST' })).toBe(true)
  })
})
