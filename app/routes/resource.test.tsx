import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { I18nProvider } from '../i18n/provider.tsx'
import { listingDetail } from '../lib/listing-detail.ts'
import Resource from './resource.tsx'

const base = sampleListingsFeed().listings.find((listing: { id: string }) => listing.id === 'ohra-showers')

function renderPage(listing: unknown, lang: 'en' | 'es' = 'en') {
  const path = lang === 'es' ? '/es/resources/:id' : '/resources/:id'
  const Stub = createRoutesStub([{ path, Component: Resource, loader: () => ({ listing }) }])
  render(
    <I18nProvider lang={lang}>
      <Stub initialEntries={[path.replace(':id', 'ohra-showers')]} />
    </I18nProvider>,
  )
}

describe('/resources/:id', () => {
  it('shows the listing under its name, with its labels and every field', async () => {
    renderPage(listingDetail({ ...base, address: '2350 Ashland St, Ashland', conflict: true }, 'en'))
    expect(await screen.findByRole('heading', { level: 1, name: base.name })).toBeDefined()
    expect(screen.getByText('Schedule needs checking')).toBeDefined()
    const details = screen.getByRole('region', { name: 'Details' })
    expect(within(details).getByText('When')).toBeDefined()
    expect(within(details).getByText(base.schedule)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Open in Google Maps (new tab)' }).getAttribute('href')).toContain(
      '2350%20Ashland%20St',
    )
    expect(screen.getByRole('link', { name: 'Call 541-631-2235' }).getAttribute('href')).toBe('tel:5416312235')
    expect(screen.getByRole('link', { name: 'Back to search' }).getAttribute('href')).toBe('/resources')
  })

  it('lists the sources and the review date', async () => {
    renderPage(listingDetail(base, 'en'))
    const sources = await screen.findByRole('region', { name: 'Sources' })
    expect(
      within(sources).getByRole('link', { name: 'ohrahelps.org/get-help/program-services' }).getAttribute('href'),
    ).toBe(base.source)
    expect(within(sources).getByText('Source reviewed Oct 23')).toBeDefined()
  })

  it('says where each detail comes from, in a disclosure', async () => {
    const provenance = {
      schedule: [
        {
          sourceType: 'website',
          sourceRef: 'https://ohrahelps.org/a',
          span: 'Tue & Thu 9-12',
          observedAt: '2026-10-23T17:00:00Z',
        },
      ],
    }
    renderPage(listingDetail({ ...base, provenance }, 'en'))
    const summary = await screen.findByText('Where does this come from?')
    const disclosure = summary.closest('details')
    expect(disclosure).not.toBeNull()
    expect(within(disclosure as HTMLElement).getByText('Tue & Thu 9-12')).toBeDefined()
    expect(within(disclosure as HTMLElement).getByText(/Seen Oct 23/)).toBeDefined()
  })

  it('says when sources for each detail are not recorded', async () => {
    renderPage(listingDetail(base, 'en'))
    expect(await screen.findByText(/Sources for each detail are not recorded yet/)).toBeDefined()
  })

  it('shows no map for a sensitive location', async () => {
    renderPage(listingDetail({ ...base, address: 'Location not published. Call the provider.' }, 'en'))
    expect(await screen.findByText('Location not published. Call the provider.')).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Open in Google Maps (new tab)' })).toBeNull()
  })

  it('says a listing that is not there is not available, with a way back', async () => {
    renderPage(null)
    expect(await screen.findByRole('heading', { level: 1, name: 'This listing is not available' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Back to search' })).toBeDefined()
  })

  it('is in Spanish under /es, with the steward’s text marked as English', async () => {
    renderPage(listingDetail(base, 'es'), 'es')
    expect(await screen.findByRole('heading', { level: 1, name: base.name })).toHaveProperty('lang', 'en')
    expect(
      within(screen.getByRole('region', { name: 'Detalles' }))
        .getByText(base.schedule)
        .getAttribute('lang'),
    ).toBe('en')
    expect(screen.getByRole('link', { name: 'Volver a la búsqueda' }).getAttribute('href')).toBe('/es/resources')
  })

  it('goes back to the search it came from', async () => {
    const Stub = createRoutesStub([
      { path: '/resources/:id', Component: Resource, loader: () => ({ listing: listingDetail(base, 'en') }) },
    ])
    render(<Stub initialEntries={[{ pathname: '/resources/ohra-showers', state: { search: '?q=show' } }]} />)
    expect((await screen.findByRole('link', { name: 'Back to search' })).getAttribute('href')).toBe('/resources?q=show')
  })
})
