import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ListingCard } from '../components/listing-card.tsx'
import List, { handle } from './list.tsx'

const card: ListingCard = {
  id: 'ohra-showers',
  name: 'A shower and a fresh start',
  provider: 'OHRA',
  categories: ['Showers and hygiene'],
  area: 'Ashland',
  schedule: { text: 'Tuesdays.', fromFeed: true },
  translated: false,
  saved: true,
  address: '2350 Ashland St',
  phone: null,
  labels: [],
}

type Data = Awaited<ReturnType<typeof import('./list.tsx').loader>>

function show(data: Data, path = '/list') {
  const Stub = createRoutesStub([{ path: '/list', Component: List, loader: () => data }])
  render(<Stub initialEntries={[path]} />)
}

describe('/list', () => {
  const url = 'https://ashlanddailyhelp.com/list?ids=ohra-showers'

  it('shows the saved list with remove buttons and a link to text it', async () => {
    show({ shared: false, cards: [card], missing: 0, presentIds: ['ohra-showers'], shareUrl: url })
    expect(await screen.findByRole('heading', { level: 1, name: 'My list' })).toBeDefined()
    expect(screen.getByRole('article', { name: card.name })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Remove from my list' }).getAttribute('href')).toBe(
      '/list/toggle?id=ohra-showers&return=%2Flist',
    )
    const text = screen.getByRole('link', { name: 'Text this list' }).getAttribute('href') ?? ''
    expect(text.startsWith('sms:?&body=')).toBe(true)
    expect(decodeURIComponent(text)).toContain(url)
  })

  it('offers to save a shared list, and says when some listings are gone', async () => {
    show(
      { shared: true, cards: [{ ...card, saved: false }], missing: 1, presentIds: ['ohra-showers'], shareUrl: url },
      '/list?ids=ohra-showers,gone',
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'A shared list' })).toBeDefined()
    expect(screen.getByText('1 listing on this list is no longer available.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Save this list on my device' }).getAttribute('href')).toBe(
      '/list/save?ids=ohra-showers',
    )
    expect(screen.getByRole('link', { name: 'Add to my list' })).toBeDefined()
  })

  it('says how to add listings when the list is empty, and ships no JavaScript', async () => {
    show({ shared: false, cards: [], missing: 0, presentIds: [], shareUrl: null })
    expect(await screen.findByText(/Nothing saved yet/)).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })
})
