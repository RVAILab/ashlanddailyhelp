import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedFooter } from './feed-footer.tsx'

const stored = {
  state: 'stored',
  generatedAt: '2026-10-25T18:05:00.000Z',
  asOf: 'Sun, Oct 25, 2026, 11:05 AM PDT',
  dataset: 'LIVE',
  updateFailing: false,
} as const

describe('FeedFooter', () => {
  it('says when the listings were published, as a machine-readable time', () => {
    render(<FeedFooter feed={stored} />)
    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toContain('Listings as of Sun, Oct 25, 2026, 11:05 AM PDT.')
    expect(within(footer).getByText('Sun, Oct 25, 2026, 11:05 AM PDT').getAttribute('datetime')).toBe(
      stored.generatedAt,
    )
    expect(footer.textContent).not.toMatch(/demonstration|out of date/)
  })

  it('says when the data is a demonstration', () => {
    render(<FeedFooter feed={{ ...stored, dataset: 'FICTIONAL_DEMONSTRATION' }} />)
    expect(screen.getByRole('contentinfo').textContent).toContain(
      'This is demonstration data. Some listings are fictional.',
    )
  })

  it('warns when the latest update failed', () => {
    render(<FeedFooter feed={{ ...stored, updateFailing: true }} />)
    expect(screen.getByRole('contentinfo').textContent).toContain(
      'The latest update could not be loaded, so these listings may be out of date.',
    )
  })

  it('says when no listings have loaded yet', () => {
    render(<FeedFooter feed={{ state: 'none' }} />)
    expect(screen.getByRole('contentinfo').textContent).toBe('Listings have not loaded yet.')
  })

  it('says when listings are unavailable, and points to 211', () => {
    render(<FeedFooter feed={{ state: 'unavailable' }} />)
    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toBe('Listings are unavailable right now. For help finding services, call 211.')
    expect(within(footer).getByRole('link', { name: '211' }).getAttribute('href')).toBe('tel:211')
  })
})
