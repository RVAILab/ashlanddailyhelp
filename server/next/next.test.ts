import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import type { FeedEvent, Opening, StoredListing } from '../feed/contract.ts'
import { groupToday } from '../today/group.ts'
import { nextPlace } from './next.ts'

const now = new Date('2026-10-25T18:00:00Z') // 11:00 AM Pacific
const sample = sampleListingsFeed().listings as StoredListing[]
const base = (id: string) => sample.find(listing => listing.id === id) as StoredListing

function listing(id: string, category: 'food' | 'housing', openings: Opening[], extra: Partial<StoredListing> = {}) {
  return { ...base('access-pantries'), id, name: id, categories: [category], openings, ...extra } as StoredListing
}

const window = (start: string, end?: string, extra: Partial<Opening> = {}): Opening => ({
  startsAt: `2026-10-25T${start}:00-07:00`,
  ...(end ? { endsAt: end.includes('T') ? end : `2026-10-25T${end}:00-07:00` } : {}),
  ...extra,
})

function event(id: string, category: 'food' | 'housing', start: string, end: string, extra: Partial<FeedEvent> = {}) {
  return {
    id,
    title: id,
    provider: 'A provider',
    categories: [category],
    description: '',
    date: '2026-10-25',
    startsAt: `2026-10-25T${start}:00-07:00`,
    endsAt: end.includes('T') ? end : `2026-10-25T${end}:00-07:00`,
    address: '1 Main St, Ashland',
    area: 'Ashland',
    cost: 'Free',
    requirements: 'None',
    ...extra,
  } as FeedEvent
}

const pick = (listings: StoredListing[], events: FeedEvent[], kind: 'meal' | 'sleep', closed = new Set<string>()) =>
  nextPlace(groupToday(listings, now, closed), events, now, kind, new Set())

describe('nextPlace', () => {
  it('picks a meal open now, staying open longest, over one later today', () => {
    const chosen = pick(
      [
        listing('lunch', 'food', [window('10:30', '13:00')]),
        listing('brunch', 'food', [window('10:00', '14:00')]),
        listing('dinner', 'food', [window('17:00', '19:00')]),
      ],
      [],
      'meal',
    )
    expect(chosen).toMatchObject({ id: 'brunch', openNow: true, endsAt: '2026-10-25T14:00:00-07:00' })
  })

  it('prefers the next start to a meal closing within half an hour, but takes that over nothing', () => {
    const closing = listing('closing', 'food', [window('10:00', '11:20')])
    expect(pick([closing, listing('dinner', 'food', [window('17:00', '19:00')])], [], 'meal')).toMatchObject({
      id: 'dinner',
      openNow: false,
    })
    expect(pick([closing], [], 'meal')).toMatchObject({ id: 'closing', openNow: true })
  })

  it('never picks a meal whose schedule needs checking, that may be canceled, or that an alert closes', () => {
    const listings = [
      listing('conflict', 'food', [window('10:00', '14:00')], { conflict: true }),
      listing('doubtful', 'food', [window('10:00', '14:00', { status: 'may_be_canceled' })]),
      listing('closed', 'food', [window('10:00', '14:00')]),
    ]
    expect(pick(listings, [], 'meal', new Set(['closed']))).toBeNull()
  })

  it('counts today’s events, but not canceled or conflicting ones, or ones an alert closes', () => {
    const groups = groupToday([], now)
    const events = [
      event('canceled', 'food', '12:00', '13:00', { status: 'canceled' }),
      event('conflict', 'food', '12:00', '13:00', { conflict: true }),
      event('closed', 'food', '12:00', '13:00'),
      event('soup', 'food', '12:30', '13:30'),
    ]
    expect(nextPlace(groups, events, now, 'meal', new Set(['closed']))).toMatchObject({
      id: 'soup',
      source: 'event',
      where: '1 Main St, Ashland',
    })
  })

  it('takes a place to sleep only from overnight housing windows, not a housing office’s hours', () => {
    const office = listing('office', 'housing', [window('09:00', '17:00')])
    const shelter = listing('shelter', 'housing', [window('19:00', '2026-10-26T07:30:00-07:00')])
    expect(pick([office], [], 'sleep')).toBeNull()
    expect(pick([office, shelter], [], 'sleep')).toMatchObject({ id: 'shelter', openNow: false })
  })

  it('says where from the window’s own location first', () => {
    const chosen = pick(
      [listing('lunch', 'food', [window('10:00', '14:00', { location: 'Pioneer Hall' })])],
      [],
      'meal',
    )
    expect(chosen?.where).toBe('Pioneer Hall')
  })

  it('looks at every window today, so daytime hours don’t hide the overnight one', () => {
    const shelter = listing('shelter', 'housing', [
      window('13:00', '15:00'),
      window('19:00', '2026-10-26T07:30:00-07:00'),
    ])
    expect(pick([shelter], [], 'sleep')).toMatchObject({ id: 'shelter', startsAt: '2026-10-25T19:00:00-07:00' })
  })
})
