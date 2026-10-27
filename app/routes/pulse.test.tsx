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
  held: null,
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
      corrections: [],
    },
    {
      weekStart: '2026-10-19',
      live: false,
      revision: 2,
      note: 'A meal count was entered twice.',
      publishedAt: '2026-10-27T16:00:00.000Z',
      corrections: [{ revision: 2, note: 'A meal count was entered twice.' }],
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
        atLeast: null,
        smallOnly: false,
        split: true,
        counted: 124,
        estimated: 0,
        scaleMax: 200,
        days: [
          day('2026-10-26', 'Mon, Oct 26', { scheduled: 1, reported: 1, amount: 124, percent: 62, status: 'reported' }),
          day('2026-10-27', 'Tue, Oct 27', { scheduled: 1, reported: 1, held: { kind: 'fewer' }, status: 'reported' }),
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
    expect(within(meals).getByText('Awaiting a report')).toBeDefined()
    expect(within(meals).getAllByText('Amount reported')).toHaveLength(2)
    expect(within(meals).getAllByText('■')[0]?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('revision 2: Correction: A meal count was entered twice.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'This week so far' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Ran out of supplies: 1 event')).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })

  it('says when nothing has been published yet', async () => {
    const Stub = createRoutesStub([{ path: '/pulse', Component: Pulse, loader: () => ({ weeks: [], week: null }) }])
    render(<Stub initialEntries={['/pulse']} />)
    expect(await screen.findByText('No Pulse numbers have been published yet.')).toBeDefined()
    expect(screen.queryByRole('navigation', { name: 'Weeks' })).toBeNull()
  })

  it('says when a published week had nothing scheduled and no unmet need, without calling it live or fictional', async () => {
    const week = { ...data.week, live: false, revision: 1, fictional: false, csv: '/pulse.csv?week=2026-10-19' }
    const quiet = { weeks: [], week: { ...week, units: [], unmet: [] } }
    const Stub = createRoutesStub([{ path: '/pulse', Component: Pulse, loader: () => quiet }])
    render(<Stub initialEntries={['/pulse']} />)
    expect(await screen.findByText('Nothing was scheduled this week.')).toBeDefined()
    expect(screen.getByText('No unmet need was reported.')).toBeDefined()
    expect(screen.queryByText(/These numbers are fictional/)).toBeNull()
    expect(screen.queryByText(/This week so far/)).toBeNull()
    const link = screen.getByRole('link', { name: 'Download this week as a spreadsheet (CSV)' })
    expect(link.getAttribute('href')).toBe('/pulse.csv?week=2026-10-19')
  })

  it('holds back small figures in the totals and the days, showing only what can be read', async () => {
    const meals = data.week.units[0]
    if (!meals) throw new Error('the sample has meals')
    const unit = (name: string, extra: object) => ({ ...meals, unit: name, split: false, days: [], ...extra })
    const held = {
      weeks: [],
      week: {
        ...data.week,
        units: [
          unit('meals', {
            total: null,
            atLeast: 130,
            days: [
              day('2026-10-26', 'Mon, Oct 26', { held: { kind: 'atLeast', atLeast: 130 }, status: 'reported' }),
              day('2026-10-27', 'Tue, Oct 27', { held: { kind: 'small' }, status: 'reported' }),
            ],
          }),
          unit('sessions', { total: null, atLeast: null, smallOnly: true }),
          unit('encounters', { total: 42, atLeast: null }),
        ],
      },
    }
    const Stub = createRoutesStub([{ path: '/pulse', Component: Pulse, loader: () => held }])
    render(<Stub initialEntries={['/pulse']} />)
    const mealsChart = await screen.findByRole('region', { name: 'Meals' })
    expect(within(mealsChart).getByText(/^At least 130 meals\. Some figures under 10 are held back/)).toBeDefined()
    expect(within(mealsChart).getByText('At least 130')).toBeDefined()
    expect(within(mealsChart).getByText('Small figures held back')).toBeDefined()
    expect(
      within(screen.getByRole('region', { name: 'Sessions' })).getByText(
        /^Every figure this week is under 10, so none is shown\./,
      ),
    ).toBeDefined()
    expect(within(screen.getByRole('region', { name: 'Encounters' })).getByText(/^42 encounters\. From/)).toBeDefined()
  })

  it('says a total is not known yet when nothing has been reported', async () => {
    const meals = data.week.units[0]
    if (!meals) throw new Error('the sample has meals')
    const unknown = {
      weeks: [],
      week: { ...data.week, units: [{ ...meals, total: null, atLeast: null, smallOnly: false, measured: 0 }] },
    }
    const Stub = createRoutesStub([{ path: '/pulse', Component: Pulse, loader: () => unknown }])
    render(<Stub initialEntries={['/pulse']} />)
    expect(
      await screen.findByText(/^Not known yet: no amounts reported\. From 0 of 3 scheduled events\./),
    ).toBeDefined()
  })
})
