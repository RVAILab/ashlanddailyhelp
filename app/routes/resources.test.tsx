import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ListingCard } from '../components/listing-card.tsx'
import Resources from './resources.tsx'

const showers: ListingCard = {
  id: 'ohra-showers',
  name: 'Shower Program',
  provider: 'OHRA',
  categories: ['Showers and hygiene'],
  area: 'Ashland',
  schedule: 'Website lists Tuesdays and Thursdays, 9 am to noon.',
  address: '2350 Ashland St, Ashland',
  phone: '541-708-6100',
  labels: [
    { kind: 'warning', text: 'Schedule needs checking' },
    { kind: 'source', text: 'Added by Daily Help from ohrahelps.org' },
  ],
}

type Data = Awaited<ReturnType<typeof import('./resources.tsx').loader>>

function renderPage(data: Partial<Data>, url = '/resources') {
  const loaderData: Data = {
    filters: {},
    areas: ['Ashland', 'Jackson County', 'Medford'],
    results: [showers],
    feedLoaded: true,
    demonstration: false,
    ...data,
  }
  const Stub = createRoutesStub([{ path: '/resources', Component: Resources, loader: () => loaderData }])
  render(<Stub initialEntries={[url]} />)
}

describe('/resources', () => {
  it('shows a labelled search form holding the current filters', async () => {
    renderPage(
      { filters: { query: 'shower', category: 'hygiene', area: 'Ashland' } },
      '/resources?q=shower&category=hygiene&area=Ashland',
    )
    const form = await screen.findByRole('search')
    expect(within(form).getByRole('searchbox', { name: 'Words to search for' })).toHaveProperty('value', 'shower')
    expect(within(form).getByRole('combobox', { name: 'Kind of help' })).toHaveProperty('value', 'hygiene')
    expect(within(form).getByRole('combobox', { name: 'Area' })).toHaveProperty('value', 'Ashland')
    expect(within(form).getByRole('option', { name: 'Jackson County (county-wide)' })).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Search' })).toBeDefined()
  })

  it('announces how many places match, and shows each as a card with its labels', async () => {
    renderPage({})
    expect((await screen.findByRole('status')).textContent).toBe('1 place')
    const card = screen.getByRole('article', { name: 'Shower Program' })
    expect(within(card).getByText('OHRA')).toBeDefined()
    expect(within(card).getByRole('link', { name: '541-708-6100' }).getAttribute('href')).toBe('tel:5417086100')
    expect(within(card).getByText('Schedule needs checking')).toBeDefined()
    expect(within(card).getByText('Added by Daily Help from ohrahelps.org')).toBeDefined()
  })

  it('says a missing phone is not confirmed', async () => {
    renderPage({ results: [{ ...showers, phone: null }] })
    expect(within(await screen.findByRole('article')).getByText('Not confirmed')).toBeDefined()
  })

  it('suggests removing filters and calling 211 when nothing matches', async () => {
    renderPage({ results: [], filters: { query: 'zzyzx' } }, '/resources?q=zzyzx')
    expect((await screen.findByRole('status')).textContent).toBe('No places match')
    const clear = screen.getByRole('link', { name: 'clear the search' })
    expect(clear.getAttribute('href')).toBe('/resources')
    expect(clear.closest('p')?.textContent).toBe(
      'Try fewer words, or another kind of help or area. You can also clear the search. For help finding services, call 211.',
    )
    expect(screen.getByRole('link', { name: 'Call 211' }).getAttribute('href')).toBe('tel:211')
  })

  it('says nothing is listed, without suggesting filters, when nothing matches an unfiltered search', async () => {
    renderPage({ results: [] })
    expect(
      await screen.findByText('No places are listed right now. For help finding services, call 211.'),
    ).toBeDefined()
    expect(screen.queryByRole('link', { name: 'clear the search' })).toBeNull()
  })

  it('says when listings have not loaded yet, instead of "no match"', async () => {
    renderPage({ results: [], feedLoaded: false })
    expect(
      await screen.findByText('Listings have not loaded yet. For help finding services now, call 211.'),
    ).toBeDefined()
    expect(screen.getByRole('link', { name: 'Call 211' })).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('gives the results a heading, so the cards sit under it', async () => {
    renderPage({})
    expect(await screen.findByRole('heading', { level: 2, name: 'Results' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Results' })).toBeDefined()
  })

  it('labels demonstration data next to the results', async () => {
    renderPage({ demonstration: true })
    expect(await screen.findByText('This is demonstration data. Some listings are fictional.')).toBeDefined()
  })
})
