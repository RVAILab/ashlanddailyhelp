import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { groupEvents } from './events.ts'

const events = JSON.parse(readFileSync('test/fixtures/proposed/events.json', 'utf8')).events

describe('groupEvents', () => {
  it('splits events into today (finished ones apart), tomorrow and later this week, in Pacific time', () => {
    const grouped = groupEvents(events, new Date('2026-10-25T18:00:00Z')) // 11:00 AM Pacific, Sunday
    const ids = (list: Array<{ id: string }>) => list.map(event => event.id)
    expect(ids(grouped.today)).toEqual(['flu-clinic-1'])
    expect(ids(grouped.finished)).toEqual(['breakfast-1'])
    expect(ids(grouped.tomorrow)).toEqual(['giveaway-1'])
    expect(ids(grouped.thisWeek)).toEqual(['showers-pop-up-1'])
  })

  it('keeps only the next seven days in this week', () => {
    const later = { ...events[3], id: 'far', date: '2026-11-03' }
    const grouped = groupEvents([...events, later], new Date('2026-10-25T18:00:00Z'))
    expect(grouped.thisWeek.map(event => event.id)).toEqual(['showers-pop-up-1'])
  })
})
