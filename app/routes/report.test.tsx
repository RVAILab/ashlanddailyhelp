import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { loaderArgs } from '../../test/route.ts'
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
})
