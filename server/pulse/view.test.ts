import { describe, expect, it } from 'vitest'
import type { PulseEvent, PulseReport } from '../../contract/steward/feed.ts'
import { niceMax, pulseWeek } from './view.ts'

const dates = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']
const week = { start: dates[0] as string, end: dates[6] as string, dates }

const event = (id: string, unit: PulseEvent['unit'], date: string, provider = `team-${id}`): PulseEvent => ({
  id,
  provider,
  service: 'Community meal',
  unit,
  date,
})
const report = (eventId: string, extra: Partial<PulseReport> = {}): PulseReport => ({
  eventId,
  outcome: 'completed',
  value: 40,
  method: 'counted',
  unmet: 'none_observed',
  reasons: [],
  ...extra,
})

describe('pulseWeek', () => {
  it('totals each unit on its own, split into counted and estimated, and never adds units together', () => {
    const view = pulseWeek({
      week,
      events: [
        event('a', 'meals', '2026-10-20'),
        event('b', 'meals', '2026-10-21'),
        event('c', 'sessions', '2026-10-22'),
      ],
      reports: [
        report('a', { value: 124 }),
        report('b', { value: 96, method: 'estimated' }),
        report('c', { value: 42 }),
      ],
    })
    expect(view.units.map(unit => [unit.unit, unit.total, unit.counted, unit.estimated])).toEqual([
      ['meals', 220, 124, 96],
      ['sessions', 42, 42, 0],
    ])
    expect(view).not.toHaveProperty('total')
  })

  it('shows an unknown amount as unknown, never zero, and a measured zero as zero', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20'), event('z', 'encounters', '2026-10-21')],
      reports: [report('a', { value: null, method: 'not_recorded' }), report('z', { value: 0 })],
    })
    expect(view.units.find(unit => unit.unit === 'meals')).toMatchObject({ total: null })
    expect(view.units.find(unit => unit.unit === 'encounters')).toMatchObject({ total: 0 })
    expect(view.units[0]?.days[1]).toMatchObject({ amount: null, status: 'not_recorded' })
  })

  it('gives each day a status: reported, partial, not recorded, canceled, awaiting a report, or nothing scheduled', () => {
    const view = pulseWeek({
      week,
      events: [
        event('reported', 'meals', '2026-10-19'),
        event('part-1', 'meals', '2026-10-20'),
        event('part-2', 'meals', '2026-10-20'),
        event('canceled', 'meals', '2026-10-21'),
        event('awaiting', 'meals', '2026-10-22'),
      ],
      reports: [
        report('reported', { value: 30 }),
        report('part-1', { value: 20 }),
        report('canceled', { outcome: 'canceled', value: null, method: 'not_recorded' }),
      ],
    })
    expect(view.units[0]?.days.map(day => day.status)).toEqual([
      'reported',
      'partial',
      'canceled',
      'awaiting',
      'none',
      'none',
      'none',
    ])
    expect(view.units[0]?.days[2]?.amount).toBeNull()
  })

  it('shows a day’s figure under 10 from a single provider as fewer than 10, but keeps the weekly total', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20'), event('b', 'meals', '2026-10-21'), event('c', 'meals', '2026-10-21')],
      reports: [report('a', { value: 6 }), report('b', { value: 4 }), report('c', { value: 3 })],
    })
    const days = view.units[0]?.days ?? []
    expect(days[1]).toMatchObject({ amount: null, fewerThanTen: true, status: 'reported' })
    expect(days[2]).toMatchObject({ amount: 7, fewerThanTen: false })
    expect(view.units[0]?.total).toBe(13)
  })

  it('counts the events that saw unmet need, by reason', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20'), event('b', 'meals', '2026-10-21')],
      reports: [
        report('a', { unmet: 'observed', reasons: ['supplies', 'capacity'] }),
        report('b', { unmet: 'observed', reasons: ['supplies'] }),
      ],
    })
    expect(view.unmet).toEqual([
      { reason: 'supplies', events: 2 },
      { reason: 'capacity', events: 1 },
    ])
    expect(view.providers).toEqual({ reported: 2, scheduled: 2 })
  })
})

describe('niceMax', () => {
  it('rounds a scale up to 1, 2 or 5 times a power of ten, from zero', () => {
    expect(niceMax(0)).toBe(10)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(124)).toBe(200)
    expect(niceMax(42)).toBe(50)
    expect(niceMax(500)).toBe(500)
  })
})
