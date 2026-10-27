import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import Providers, { handle, loader } from './providers.tsx'

describe('/providers', () => {
  it('finds a provider’s listings and links each to its check page', async () => {
    const data = {
      name: 'ohra',
      listings: [{ id: 'ohra-showers', name: 'A shower and a fresh start', provider: 'OHRA' }],
    }
    const Stub = createRoutesStub([{ path: '/providers', Component: Providers, loader: () => data }])
    render(<Stub initialEntries={['/providers?name=ohra']} />)
    expect((await screen.findByRole('searchbox', { name: 'Organization name' })).getAttribute('value')).toBe('ohra')
    expect(screen.getByRole('link', { name: /A shower and a fresh start/ }).getAttribute('href')).toBe(
      '/report?listing=ohra-showers',
    )
    expect(handle).toEqual({ hydrate: false })
  })

  it('says when nothing matches', async () => {
    const Stub = createRoutesStub([
      { path: '/providers', Component: Providers, loader: () => ({ name: 'zzz', listings: [] }) },
    ])
    render(<Stub initialEntries={['/providers?name=zzz']} />)
    expect(await screen.findByText('No listings match that name.')).toBeDefined()
  })

  it('shows only the search form before a name is entered', async () => {
    const Stub = createRoutesStub([
      { path: '/providers', Component: Providers, loader: () => ({ name: '', listings: [] }) },
    ])
    render(<Stub initialEntries={['/providers']} />)
    expect(await screen.findByRole('searchbox', { name: 'Organization name' })).toBeDefined()
    expect(screen.queryByText('No listings match that name.')).toBeNull()
  })
})

describe('/providers loader', () => {
  it('finds listings by part of the provider’s name, ignoring spaces around it', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const found = await loader(loaderArgs(`/providers?name=${encodeURIComponent('  ohra ')}`, { database: () => db }))
    await db.close()
    expect(found.name).toBe('ohra')
    expect(found.listings.map(listing => listing.id)).toEqual(['ohra-navigation', 'ohra-showers', 'ohra-shelter'])
    expect(found.listings[1]).toEqual({
      id: 'ohra-showers',
      name: 'A shower and a fresh start',
      provider: 'OHRA Laundry & Shower Trailer',
    })
  })

  it('keeps a long name to 100 characters, and finds nothing without a name or a database', async () => {
    const long = await loader(loaderArgs(`/providers?name=${'a'.repeat(150)}`))
    expect(long).toEqual({ name: 'a'.repeat(100), listings: [] })
    expect(await loader(loaderArgs('/providers'))).toEqual({ name: '', listings: [] })
    const db = await testDatabase()
    await storeListings(db)
    expect(await loader(loaderArgs('/providers?name=%20', { database: () => db }))).toEqual({ name: '', listings: [] })
    await db.close()
  })
})
