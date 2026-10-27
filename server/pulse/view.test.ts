import { describe, expect, it } from 'vitest'
import type { PulseEvent, PulseReport } from '../../contract/steward/feed.ts'
import { heldEvents, niceMax, pulseWeek } from './view.ts'

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

  it('shows an unknown amount as unknown, never zero, and holds back a measured zero like any small figure', () => {
    const view = pulseWeek({
      week,
      events: [
        event('a', 'meals', '2026-10-20'),
        event('y', 'encounters', '2026-10-21'),
        event('z', 'encounters', '2026-10-21'),
      ],
      reports: [
        report('a', { value: null, method: 'not_recorded' }),
        report('y', { value: 0 }),
        report('z', { value: 0 }),
      ],
    })
    expect(view.units.find(unit => unit.unit === 'meals')).toMatchObject({ total: null })
    expect(view.units.find(unit => unit.unit === 'encounters')).toMatchObject({ total: null, smallOnly: true })
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

  it('never lets a provider’s daily figure under 10 be read, or worked out by subtraction', () => {
    const view = pulseWeek({
      week,
      events: [
        event('a', 'meals', '2026-10-20', 'A'),
        event('b', 'meals', '2026-10-21', 'B'),
        event('c', 'meals', '2026-10-21', 'C'),
        event('d', 'meals', '2026-10-22', 'D'),
      ],
      reports: [
        report('a', { value: 6 }),
        report('b', { value: 4 }),
        report('c', { value: 50, method: 'estimated' }),
        report('d', { value: 30 }),
      ],
    })
    const meals = view.units[0]
    const days = meals?.days ?? []
    expect(days[1]).toMatchObject({ amount: null, held: { kind: 'fewer' }, status: 'reported' })
    expect(days[2]).toMatchObject({ amount: null, held: { kind: 'atLeast', atLeast: 50 } })
    expect(days[3]).toMatchObject({ amount: 30, held: null })
    expect(meals).toMatchObject({ total: null, atLeast: 80, smallOnly: false, split: false })
  })

  it('holds back the week total when any small figure is in it, giving only what is certain', () => {
    const one = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20', 'A'), event('b', 'meals', '2026-10-21', 'B')],
      reports: [report('a', { value: 6 }), report('b', { value: 40 })],
    })
    expect(one.units[0]).toMatchObject({ total: null, atLeast: 40, split: false })
    const alone = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20', 'A')],
      reports: [report('a', { value: 6 })],
    })
    expect(alone.units[0]).toMatchObject({ total: null, atLeast: null, smallOnly: true })
  })

  it('counts the amount from an event that ran only partly', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20'), event('b', 'meals', '2026-10-21')],
      reports: [report('a', { value: 30 }), report('b', { outcome: 'partial', value: 20 })],
    })
    expect(view.units[0]).toMatchObject({ total: 50, measured: 2 })
  })

  it('holds back a day made only of small figures, even when together they reach 10', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20', 'A'), event('b', 'meals', '2026-10-20', 'B')],
      reports: [report('a', { value: 6 }), report('b', { value: 7 })],
    })
    expect(view.units[0]?.days[1]).toMatchObject({ amount: null, held: { kind: 'small' } })
  })

  it('counts only providers with a scheduled event as having reported', () => {
    const view = pulseWeek({
      week,
      events: [event('a', 'meals', '2026-10-20')],
      reports: [report('a'), report('not-scheduled')],
    })
    expect(view.providers).toEqual({ reported: 1, scheduled: 1 })
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

describe('heldEvents', () => {
  it('names every event whose provider’s figure for that day is under 10, for exports one row per event', () => {
    const held = heldEvents({
      week,
      events: [
        event('a', 'meals', '2026-10-20', 'A'),
        event('b1', 'meals', '2026-10-21', 'B'),
        event('b2', 'meals', '2026-10-21', 'B'),
        event('c', 'meals', '2026-10-21', 'C'),
      ],
      reports: [
        report('a', { value: 6 }),
        report('b1', { value: 6 }),
        report('b2', { value: 6 }),
        report('c', { value: 3 }),
      ],
    })
    expect([...held].sort()).toEqual(['a', 'c'])
  })
})
