import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ListingCard } from '../components/listing-card.tsx'
import Today from './today.tsx'

const card = (id: string, name: string): ListingCard => ({
  id,
  name,
  provider: 'OHRA',
  categories: ['Food'],
  area: 'Ashland',
  schedule: { text: 'Website lists weekdays.', fromFeed: true },
  translated: false,
  address: '2350 Ashland St',
  phone: null,
  labels: [{ kind: 'warning', text: 'Schedule needs checking' }],
})

describe('/today', () => {
  it('shows the four groups with counts, each entry with today’s hours', async () => {
    const loaderData = {
      filters: {},
      areas: ['Ashland'],
      workedOut: '11:00 AM',
      now: '2026-10-25T18:00:00.000Z',
      nextChange: null,
      events: {
        today: [
          {
            id: 'flu',
            title: 'Free flu shot clinic',
            provider: 'Jackson County Public Health',
            when: '1:00 PM–4:00 PM',
            where: 'Ashland Library',
            status: null,
            labels: [{ kind: 'caution' as const, text: 'Not yet confirmed by provider' }],
            listingId: null,
          },
        ],
        finished: [],
        tomorrow: [
          {
            id: 'coats',
            title: 'Coat giveaway',
            provider: 'Ashland Rotary',
            when: '10:00 AM',
            where: 'Ashland Plaza',
            status: { kind: 'canceled' as const, text: 'Canceled. Posted by Ashland Rotary.' },
            labels: [],
            listingId: 'rotary',
          },
        ],
        thisWeek: [],
      },
      groups: {
        openNow: [
          { card: card('a', 'Showers'), when: 'Open until 2:00 PM', hours: 'Today: 9:00 AM–12:00 PM, 1:00 PM–2:00 PM' },
        ],
        later: [],
        closed: [],
        notConfirmed: [{ card: card('b', 'Community meal'), when: 'Hours not confirmed', hours: null }],
      },
    }
    const Stub = createRoutesStub([{ path: '/today', Component: Today, loader: () => loaderData }])
    render(<Stub initialEntries={['/today']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Open today' })).toBeDefined()
    expect(screen.getByText(/Worked out at 11:00 AM/)).toBeDefined()
    const open = screen.getByRole('region', { name: 'Open now (1)' })
    expect(within(open).getByText('Open until 2:00 PM')).toBeDefined()
    expect(within(open).getByText('Today: 9:00 AM–12:00 PM, 1:00 PM–2:00 PM')).toBeDefined()
    expect(within(open).getByRole('article', { name: 'Showers' })).toBeDefined()
    expect(
      within(screen.getByRole('region', { name: 'Later today (0)' })).getByText('Nothing here right now.'),
    ).toBeDefined()
    expect(
      within(screen.getByRole('region', { name: 'Hours not confirmed (1)' })).getByText('Schedule needs checking'),
    ).toBeDefined()
  })

  it('says there are no scheduled events today, never sample ones', async () => {
    const loaderData = {
      filters: {},
      areas: [],
      workedOut: '11:00 AM',
      now: '2026-10-25T18:00:00.000Z',
      nextChange: null,
      events: { today: [], finished: [], tomorrow: [], thisWeek: [] },
      groups: { openNow: [], later: [], closed: [], notConfirmed: [] },
    }
    const Stub = createRoutesStub([{ path: '/today', Component: Today, loader: () => loaderData }])
    render(<Stub initialEntries={['/today']} />)
    expect(await screen.findByText('No scheduled events today.')).toBeDefined()
  })
})
