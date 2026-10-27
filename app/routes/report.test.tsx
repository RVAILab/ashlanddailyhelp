import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
import { listingDetail } from '../lib/listing-detail.ts'
import Report, { handle, loader } from './report.tsx'

describe('/report', () => {
  it('shows the listing with its sources, and a correction email carrying the listing id', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const data = (
      await loader(
        loaderArgs('https://ashlanddailyhelp.com/report?listing=ohra-showers', {
          database: () => db,
          correctionsEmail: 'intake@example.org',
        }),
      )
    ).data
    await db.close()
    const Stub = createRoutesStub([{ path: '/report', Component: Report, loader: () => data }])
    render(<Stub initialEntries={['/report?listing=ohra-showers']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Check this listing' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 2, name: 'A shower and a fresh start' })).toBeDefined()
    const link = screen.getByRole('link', { name: 'Request a correction by email' })
    const href = decodeURIComponent(link.getAttribute('href') ?? '')
    expect(href.startsWith('mailto:intake@example.org?subject=')).toBe(true)
    expect(href).toContain('ohra-showers')
    expect(href).toContain('https://ashlanddailyhelp.com/resources/ohra-showers')
    expect(
      within(screen.getByRole('region', { name: 'Where each detail comes from' })).getAllByRole('listitem').length,
    ).toBeGreaterThan(0)
  })

  it('says corrections can’t be sent online yet when no address is set', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const data = (await loader(loaderArgs('/report?listing=ohra-showers', { database: () => db }))).data
    await db.close()
    const Stub = createRoutesStub([{ path: '/report', Component: Report, loader: () => data }])
    render(<Stub initialEntries={['/report?listing=ohra-showers']} />)
    expect(await screen.findByText(/can’t be sent online yet/)).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Request a correction by email' })).toBeNull()
  })

  it('marks a report about an automatic translation', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const data = (
      await loader(
        loaderArgs('/report?listing=ohra-showers&about=translation', {
          database: () => db,
          correctionsEmail: 'intake@example.org',
        }),
      )
    ).data
    await db.close()
    expect(decodeURIComponent(data.mailto ?? '')).toContain('automatic Spanish translation')
  })

  it('answers 404 for an unknown listing, and ships no JavaScript', async () => {
    const db = await testDatabase()
    const data = (await loader(loaderArgs('/report?listing=nope', { database: () => db }))).data
    await db.close()
    expect(data.listing).toBeNull()
    expect(handle).toEqual({ hydrate: false })
  })

  it('answers 404 without a listing to report, or without a database', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const unnamed = await loader(loaderArgs('/report', { database: () => db }))
    await db.close()
    expect(unnamed.init?.status).toBe(404)
    const offline = await loader(loaderArgs('/report?listing=ohra-showers'))
    expect(offline.init?.status).toBe(404)
    expect(offline.data.listing).toBeNull()
  })

  it('says a listing that is not there is not available, pointing providers to checking their listing', async () => {
    const Stub = createRoutesStub([
      { path: '/report', Component: Report, loader: () => ({ listing: null, mailto: null }) },
    ])
    render(<Stub initialEntries={['/report?listing=nope']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'This listing is not available' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Check your listing' }).getAttribute('href')).toBe('/providers')
  })

  it('lists where each detail comes from, quoting the source when there is a passage', async () => {
    const base = sampleListingsFeed().listings.find((listing: { id: string }) => listing.id === 'ohra-showers')
    const seen = { sourceType: 'website', sourceRef: 'https://ohrahelps.org/a', observedAt: '2026-10-23T17:00:00Z' }
    const listing = listingDetail(
      { ...base, provenance: { schedule: [{ ...seen, span: 'Tue & Thu 9-12' }], cost: [{ ...seen, span: null }] } },
      'en',
    )
    const Stub = createRoutesStub([{ path: '/report', Component: Report, loader: () => ({ listing, mailto: null }) }])
    render(<Stub initialEntries={['/report?listing=ohra-showers']} />)
    const where = await screen.findByRole('region', { name: 'Where each detail comes from' })
    const items = within(where)
      .getAllByRole('listitem')
      .map(item => item.textContent)
    expect(items).toContain('When: ohrahelps.org (Website), “Tue & Thu 9-12”. Seen Oct 23.')
    expect(items).toContain('Cost: ohrahelps.org (Website). Seen Oct 23.')
  })
})
