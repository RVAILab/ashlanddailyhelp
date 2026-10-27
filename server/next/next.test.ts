import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import type { FeedEvent, Opening, StoredListing } from '../feed/contract.ts'
import { nextPlace } from './next.ts'

const now = new Date('2026-10-25T18:00:00Z') // 11:00 AM Pacific
const sample = sampleListingsFeed().listings as StoredListing[]
const base = (id: string) => sample.find(listing => listing.id === id) as StoredListing

function listing(id: string, category: 'food' | 'housing', openings: Opening[], extra: Partial<StoredListing> = {}) {
  return { ...base('access-pantries'), id, name: id, categories: [category], openings, ...extra } as StoredListing
}

const at = (time: string) => (time.includes('T') ? time : `2026-10-25T${time}:00-07:00`)
const window = (start: string, end?: string, extra: Partial<Opening> = {}): Opening => ({
  startsAt: at(start),
  ...(end ? { endsAt: at(end) } : {}),
  ...extra,
})

function event(id: string, category: 'food' | 'housing', start: string, end: string, extra: Partial<FeedEvent> = {}) {
  return {
    id,
    title: id,
    provider: 'A provider',
    categories: [category],
    description: '',
    date: at(start).slice(0, 10),
    startsAt: at(start),
    endsAt: at(end),
    address: '1 Main St, Ashland',
    area: 'Ashland',
    cost: 'Free',
    requirements: 'None',
    ...extra,
  } as FeedEvent
}

const pick = (
  listings: StoredListing[],
  events: FeedEvent[],
  kind: 'meal' | 'sleep',
  closedUntil: Record<string, string> = {},
) => nextPlace(listings, events, now, kind, closedUntil)

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
    expect(pick(listings, [], 'meal', { closed: '2026-10-25T20:00:00-07:00' })).toBeNull()
  })

  it('counts today’s events, but not canceled or conflicting ones, or ones an alert closes', () => {
    const events = [
      event('canceled', 'food', '12:00', '13:00', { status: 'canceled' }),
      event('conflict', 'food', '12:00', '13:00', { conflict: true }),
      event('closed', 'food', '12:00', '13:00'),
      event('soup', 'food', '12:30', '13:30'),
    ]
    expect(pick([], events, 'meal', { closed: '2026-10-25T20:00:00-07:00' })).toMatchObject({
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

  it('looks past today: tomorrow’s breakfast is the next meal when nothing is left today', () => {
    const breakfast = listing('breakfast', 'food', [
      window('07:00', '09:00'),
      window('2026-10-26T07:00:00-07:00', '2026-10-26T09:00:00-07:00'),
    ])
    expect(pick([breakfast], [], 'meal')).toMatchObject({ id: 'breakfast', startsAt: '2026-10-26T07:00:00-07:00' })
    const supper = event('supper', 'food', '2026-10-27T17:00:00-07:00', '2026-10-27T19:00:00-07:00')
    expect(pick([], [supper], 'meal')).toMatchObject({ id: 'supper', openNow: false })
  })

  it('leaves out a place only while an alert closes it', () => {
    const pantry = listing('pantry', 'food', [
      window('10:00', '14:00'),
      window('2026-10-26T10:00:00-07:00', '2026-10-26T14:00:00-07:00'),
    ])
    expect(pick([pantry], [], 'meal', { pantry: '2026-10-25T23:59:00-07:00' })).toMatchObject({
      startsAt: '2026-10-26T10:00:00-07:00',
    })
  })

  it('looks no further than a week ahead', () => {
    const far = listing('far', 'food', [window('2026-11-05T12:00:00-08:00', '2026-11-05T13:00:00-08:00')])
    expect(pick([far], [], 'meal')).toBeNull()
  })

  it('takes a meal with only a start time once it is ahead, but not after it has started', () => {
    const started = listing('started', 'food', [window('10:00')])
    const ahead = listing('ahead', 'food', [window('17:00')])
    expect(pick([started, ahead], [], 'meal')).toMatchObject({ id: 'ahead', openNow: false, endsAt: null })
    expect(pick([started], [], 'meal')).toBeNull()
  })

  it('takes an event with only a start time, with no end to show', () => {
    const soup = { ...event('soup', 'food', '12:30', '13:30'), endsAt: undefined } as FeedEvent
    expect(pick([], [soup], 'meal')).toMatchObject({ id: 'soup', source: 'event', endsAt: null })
  })

  it('never takes a place to sleep without an end time, since it can’t tell the window runs overnight', () => {
    expect(pick([listing('cots', 'housing', [window('20:00')])], [], 'sleep')).toBeNull()
  })

  it('skips a listing with no schedule at all', () => {
    expect(pick([listing('unscheduled', 'food', [], { openings: undefined })], [], 'meal')).toBeNull()
  })

  it('never takes an event run by a listing whose schedule is in doubt', () => {
    const doubtful = listing('kitchen', 'food', [], { conflict: true })
    expect(pick([doubtful], [event('soup', 'food', '12:30', '13:30', { listingId: 'kitchen' })], 'meal')).toBeNull()
  })
})
