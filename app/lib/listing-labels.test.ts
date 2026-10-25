import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { listingLabels } from './listing-labels.ts'

const { provenanceLabel: _, ...base } = sampleListingsFeed().listings[0]

describe('listingLabels', () => {
  it('shows where the listing came from and when it was reviewed', () => {
    expect(listingLabels({ ...base, reviewedDate: '2026-10-23' }, 'en')).toEqual([
      { kind: 'source', text: 'Source reviewed · Oct 23' },
    ])
    expect(listingLabels({ ...base, provenanceLabel: 'Posted by Peace House' }, 'en')).toEqual([
      { kind: 'source', text: 'Posted by Peace House', fromFeed: true },
    ])
  })

  it('puts warnings first: a schedule conflict, then a possible cancellation', () => {
    const labels = listingLabels(
      {
        ...base,
        conflict: true,
        mayBeCanceled: 'May be canceled tonight. Call before traveling.',
      },
      'en',
    )
    expect(labels.slice(0, 2)).toEqual([
      { kind: 'warning', text: 'Schedule needs checking' },
      { kind: 'warning', text: 'May be canceled tonight. Call before traveling.', fromFeed: true },
    ])
  })

  it('says when a listing is not yet confirmed, or is a fictional example', () => {
    expect(listingLabels({ ...base, unconfirmed: true }, 'en')).toContainEqual({
      kind: 'caution',
      text: 'Not yet confirmed by provider',
    })
    expect(listingLabels({ ...base, tags: ['FICTIONAL_DEMONSTRATION'] }, 'en')).toContainEqual({
      kind: 'caution',
      text: 'Fictional example',
    })
  })

  it('gives the end time and the last confirmation in Pacific time', () => {
    const labels = listingLabels(
      { ...base, endsAt: '2026-10-26T14:30:00.000Z', lastConfirmed: '2026-10-23T05:00:00Z' },
      'en',
    )
    expect(labels).toContainEqual({ kind: 'time', text: 'Ends Mon, Oct 26, 7:30 AM' })
    expect(labels).toContainEqual({ kind: 'source', text: 'Last confirmed Oct 22' })
  })

  it('gives the labels in Spanish, with Spanish dates', () => {
    const labels = listingLabels(
      { ...base, conflict: true, unconfirmed: true, endsAt: '2026-10-26T14:30:00.000Z', reviewedDate: '2026-10-23' },
      'es',
    )
    expect(labels).toEqual([
      { kind: 'warning', text: 'Verifique el horario antes de ir' },
      { kind: 'caution', text: 'La organización todavía no lo ha confirmado' },
      { kind: 'time', text: 'Termina el lunes, 26 de octubre, 7:30 a.m.' },
      { kind: 'source', text: 'Información revisada el 23 de octubre' },
    ])
  })

  it('adds nothing for fields that are absent or false', () => {
    expect(listingLabels({ ...base, conflict: false }, 'en')).toHaveLength(1)
  })
})

describe('listingLabels with stored translations', () => {
  it('shows a translated cancellation note in Spanish, marked translated', () => {
    const note = 'May be canceled tonight. Call before traveling.'
    const labels = listingLabels(
      { ...base, mayBeCanceled: note },
      'es',
      new Map([[note, 'Podría cancelarse esta noche. Llame antes de ir.']]),
    )
    expect(labels).toContainEqual({
      kind: 'warning',
      text: 'Podría cancelarse esta noche. Llame antes de ir.',
      translated: true,
    })
  })
})
