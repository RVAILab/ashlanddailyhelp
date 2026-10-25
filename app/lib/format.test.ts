import { describe, expect, it } from 'vitest'
import { formatAsOf } from './format.ts'

describe('formatAsOf', () => {
  it('gives the day, date, year and time in Pacific time, with the zone', () => {
    expect(formatAsOf('2026-10-25T18:05:00.000Z')).toBe('Sun, Oct 25, 2026, 11:05 AM PDT')
    expect(formatAsOf('2026-12-01T17:00:00.000Z')).toBe('Tue, Dec 1, 2026, 9:00 AM PST')
  })
})
