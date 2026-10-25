import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { groupToday } from './group.ts'

const base = sampleListingsFeed().listings[0]
const listing = (id: string, extra: Record<string, unknown> = {}) => ({
  ...base,
  id,
  conflict: false,
  mayBeCanceled: undefined,
  ...extra,
})
const window = (start: string, end?: string, extra: Record<string, unknown> = {}) => ({
  startsAt: start,
  ...(end ? { endsAt: end } : {}),
  ...extra,
})
// 11:00 AM Pacific on Sunday, Oct 25 2026
const now = new Date('2026-10-25T18:00:00Z')

describe('groupToday', () => {
  const ids = (group: Array<{ listing: { id: string } }>) => group.map(entry => entry.listing.id)

  it('puts each listing in one group by its windows today, in Pacific time', () => {
    const grouped = groupToday(
      [
        listing('open', { openings: [window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00')] }),
        listing('later', { openings: [window('2026-10-25T17:00:00-07:00', '2026-10-25T19:00:00-07:00')] }),
        listing('closed', {
          openings: [
            window('2026-10-25T07:00:00-07:00', '2026-10-25T08:00:00-07:00'),
            window('2026-10-26T07:00:00-07:00', '2026-10-26T08:00:00-07:00'),
          ],
        }),
        listing('tomorrow', { openings: [window('2026-10-26T09:00:00-07:00', '2026-10-26T12:00:00-07:00')] }),
        listing('unknown'),
      ],
      now,
    )
    expect(ids(grouped.openNow)).toEqual(['open'])
    expect(ids(grouped.later)).toEqual(['later'])
    expect(ids(grouped.closed)).toEqual(['closed', 'tomorrow'])
    expect(ids(grouped.notConfirmed)).toEqual(['unknown'])
    expect(grouped.openNow[0]?.window?.endsAt).toBe('2026-10-25T12:00:00-07:00')
  })

  it('counts an overnight window that started yesterday as open now', () => {
    const early = new Date('2026-10-25T13:00:00Z') // 6:00 AM Pacific
    const grouped = groupToday(
      [listing('shelter', { openings: [window('2026-10-24T19:00:00-07:00', '2026-10-25T07:30:00-07:00')] })],
      early,
    )
    expect(ids(grouped.openNow)).toEqual(['shelter'])
  })

  it('never says open when the schedule needs checking, may be canceled, or the window is canceled', () => {
    const openWindow = [window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00')]
    const grouped = groupToday(
      [
        listing('conflict', { conflict: true, openings: openWindow }),
        listing('maybe', { mayBeCanceled: 'May be canceled.', openings: openWindow }),
        listing('canceled', {
          openings: [
            window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00', {
              status: 'canceled',
              note: 'Canceled today.',
            }),
          ],
        }),
      ],
      now,
    )
    expect(ids(grouped.openNow)).toEqual([])
    expect(ids(grouped.notConfirmed)).toEqual(['conflict', 'maybe'])
    expect(ids(grouped.closed)).toEqual(['canceled'])
    expect(grouped.closed[0]?.canceled).toBe('Canceled today.')
  })

  it('treats a window with only a start time as later until it starts, then as not knowing when it ends', () => {
    const grouped = groupToday(
      [
        listing('starts-later', { openings: [window('2026-10-25T13:00:00-07:00')] }),
        listing('started', { openings: [window('2026-10-25T10:00:00-07:00')] }),
      ],
      now,
    )
    expect(ids(grouped.later)).toEqual(['starts-later'])
    expect(ids(grouped.notConfirmed)).toEqual(['started'])
  })

  it('orders open listings by when they close, and later ones by when they open', () => {
    const grouped = groupToday(
      [
        listing('late', { openings: [window('2026-10-25T09:00:00-07:00', '2026-10-25T16:00:00-07:00')] }),
        listing('soon', { openings: [window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00')] }),
        listing('evening', { openings: [window('2026-10-25T18:00:00-07:00', '2026-10-25T20:00:00-07:00')] }),
        listing('noon', { openings: [window('2026-10-25T12:30:00-07:00', '2026-10-25T13:00:00-07:00')] }),
      ],
      now,
    )
    expect(ids(grouped.openNow)).toEqual(['soon', 'late'])
    expect(ids(grouped.later)).toEqual(['noon', 'evening'])
  })

  it('says when the grouping next changes', () => {
    const grouped = groupToday(
      [listing('open', { openings: [window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00')] })],
      now,
    )
    expect(grouped.nextChange?.toISOString()).toBe('2026-10-25T19:00:00.000Z')
  })
})

describe('groupToday, from the review', () => {
  const ids = (group: Array<{ listing: { id: string } }>) => group.map(entry => entry.listing.id)

  it('never shows a window that may be canceled as open, and carries its note', () => {
    const grouped = groupToday(
      [
        listing('maybe', {
          openings: [
            window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00', {
              status: 'may_be_canceled',
              note: 'May be canceled if it rains.',
            }),
          ],
        }),
      ],
      now,
    )
    expect(ids(grouped.openNow)).toEqual([])
    expect(grouped.notConfirmed[0]?.mayBeCanceled).toBe('May be canceled if it rains.')
  })

  it('says hours are not confirmed, not closed, when the windows stop before today', () => {
    const grouped = groupToday(
      [listing('stale', { openings: [window('2026-10-20T09:00:00-07:00', '2026-10-20T12:00:00-07:00')] })],
      now,
    )
    expect(ids(grouped.notConfirmed)).toEqual(['stale'])
  })

  it('gives all of today’s windows, in order', () => {
    const grouped = groupToday(
      [
        listing('split', {
          openings: [
            window('2026-10-25T13:00:00-07:00', '2026-10-25T15:00:00-07:00'),
            window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00'),
          ],
        }),
      ],
      now,
    )
    expect(grouped.openNow[0]?.today.map(entry => entry.startsAt)).toEqual([
      '2026-10-25T09:00:00-07:00',
      '2026-10-25T13:00:00-07:00',
    ])
  })

  it('sorts by the instant, not the text, across a change of offset', () => {
    const fallBack = new Date('2026-11-01T08:30:00Z') // 1:30 AM PDT, before the clocks go back
    const grouped = groupToday(
      [
        listing('pst', { openings: [window('2026-11-01T01:15:00-08:00', '2026-11-01T03:00:00-08:00')] }),
        listing('pdt', { openings: [window('2026-11-01T01:45:00-07:00', '2026-11-01T03:00:00-07:00')] }),
      ],
      fallBack,
    )
    expect(ids(grouped.later)).toEqual(['pdt', 'pst'])
  })
})

describe('groupToday with closure alerts', () => {
  it('never shows a listing as open while an alert closes it', () => {
    const open = [window('2026-10-25T09:00:00-07:00', '2026-10-25T12:00:00-07:00')]
    const grouped = groupToday([listing('closed-by-alert', { openings: open })], now, new Set(['closed-by-alert']))
    expect(grouped.openNow).toEqual([])
    expect(grouped.closed.map(entry => entry.listing.id)).toEqual(['closed-by-alert'])
  })
})
