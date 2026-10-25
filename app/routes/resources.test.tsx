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
    expect(within(card).getByRole('link', { name: '541-708-6100' }).getAttribute('href')).toBe('tel:541-708-6100')
    expect(within(card).getByText('Schedule needs checking')).toBeDefined()
    expect(within(card).getByText('Added by Daily Help from ohrahelps.org')).toBeDefined()
  })

  it('says when no phone is listed', async () => {
    renderPage({ results: [{ ...showers, phone: null }] })
    expect(within(await screen.findByRole('article')).getByText('Phone not listed')).toBeDefined()
  })

  it('suggests removing filters and calling 211 when nothing matches', async () => {
    renderPage({ results: [], filters: { query: 'zzyzx' } }, '/resources?q=zzyzx')
    expect((await screen.findByRole('status')).textContent).toBe('No places match')
    expect(screen.getByRole('link', { name: 'clear the search' }).getAttribute('href')).toBe('/resources')
    expect(screen.getByRole('link', { name: '211' }).getAttribute('href')).toBe('tel:211')
    const advice = screen.getByRole('link', { name: 'clear the search' }).closest('p')
    expect(advice?.textContent).toBe(
      'Try fewer words or another area, or clear the search. For help finding services, call 211.',
    )
  })

  it('says when listings have not loaded yet, instead of "no match"', async () => {
    renderPage({ results: [], feedLoaded: false })
    const message = 'Listings have not loaded yet. For help finding services now, call 211.'
    expect(
      await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === message),
    ).toBeDefined()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('labels demonstration data next to the results', async () => {
    renderPage({ demonstration: true })
    expect(await screen.findByText('This is demonstration data. Some listings are fictional.')).toBeDefined()
  })
})
