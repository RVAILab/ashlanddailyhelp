import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Pulse, { handle } from './pulse.tsx'

const day = (date: string, label: string, extra = {}) => ({
  date,
  label,
  scheduled: 0,
  reported: 0,
  amount: null,
  fewerThanTen: false,
  percent: 0,
  status: 'none',
  ...extra,
})

const data = {
  weeks: [
    {
      weekStart: '2026-10-26',
      live: true,
      revision: null,
      note: null,
      publishedAt: null,
      label: 'This week so far',
      href: '/pulse',
      current: true,
    },
    {
      weekStart: '2026-10-19',
      live: false,
      revision: 2,
      note: 'A meal count was entered twice.',
      publishedAt: '2026-10-27T16:00:00.000Z',
      label: 'Week of Mon, Oct 19',
      href: '/pulse?week=2026-10-19',
      current: false,
    },
  ],
  week: {
    weekStart: '2026-10-26',
    live: true,
    revision: null,
    note: null,
    fictional: true,
    csv: '/pulse.csv',
    providers: { reported: 1, scheduled: 2 },
    unmet: [{ reason: 'supplies', events: 1 }],
    units: [
      {
        unit: 'meals',
        scheduled: 3,
        measured: 1,
        total: 124,
        counted: 124,
        estimated: 0,
        scaleMax: 200,
        days: [
          day('2026-10-26', 'Mon, Oct 26', { scheduled: 1, reported: 1, amount: 124, percent: 62, status: 'reported' }),
          day('2026-10-27', 'Tue, Oct 27', { scheduled: 1, reported: 1, fewerThanTen: true, status: 'reported' }),
          day('2026-10-28', 'Wed, Oct 28', { scheduled: 1, status: 'awaiting' }),
        ],
      },
    ],
  },
}

describe('/pulse', () => {
  it('labels fictional and live numbers, and gives every day a word and a shape', async () => {
    const Stub = createRoutesStub([{ path: '/pulse', Component: Pulse, loader: () => data }])
    render(<Stub initialEntries={['/pulse']} />)
    expect(await screen.findByText(/These numbers are fictional/)).toBeDefined()
    expect(screen.getByText('This week so far. Numbers can change until the week is published.')).toBeDefined()
    const meals = screen.getByRole('region', { name: 'Meals' })
    expect(within(meals).getByText(/124 meals: 124 counted, 0 estimated\./)).toBeDefined()
    expect(within(meals).getByText('Bars run from 0 to 200.')).toBeDefined()
    expect(within(meals).getByText('Fewer than 10')).toBeDefined()
    expect(within(meals).getByText('◌ Awaiting a report')).toBeDefined()
    expect(within(meals).getAllByText('■ Amount reported')).toHaveLength(2)
    expect(screen.getByText('Correction: A meal count was entered twice.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'This week so far' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Ran out of supplies: 1 event')).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })
})
