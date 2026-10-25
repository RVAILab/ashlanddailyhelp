import { render as renderInPage, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FeedFooter } from './feed-footer.tsx'

const render = (footer: ReactElement, at = '/') =>
  renderInPage(<MemoryRouter initialEntries={[at]}>{footer}</MemoryRouter>)

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
    expect(screen.getByRole('contentinfo').textContent).toContain('Listings have not loaded yet.')
  })

  it('says when listings are unavailable, and points to 211', () => {
    render(<FeedFooter feed={{ state: 'unavailable' }} />)
    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toContain('Listings are unavailable right now. For help finding services, call 211.')
    expect(within(footer).getByRole('link', { name: '211' }).getAttribute('href')).toBe('tel:211')
  })

  it('ends every page with the emergency and crisis numbers, each one tap to call', () => {
    render(<FeedFooter feed={{ state: 'none' }} />)
    const numbers = within(screen.getByRole('contentinfo')).getByRole('navigation', {
      name: 'Emergency and crisis numbers',
    })
    expect(
      within(numbers)
        .getAllByRole('link')
        .map(link => [link.textContent?.replace(/\s+/g, ' ').trim(), link.getAttribute('href')]),
    ).toEqual([
      ['Call 911', 'tel:911'],
      ['Call 988', 'tel:988'],
      ['Call 541-774-8201', 'tel:5417748201'],
      ['Call 211', 'tel:211'],
    ])
    expect(numbers.textContent?.replace(/\s+/g, ' ')).toContain(
      'Call 988 • Call 541-774-8201 Mental Health Crisis Line',
    )
  })

  it('offers text-only mode, or the full version, coming back to the same page', () => {
    render(<FeedFooter feed={stored} />, '/resources?q=meal')
    expect(screen.getByRole('link', { name: 'Text-only version (uses less data)' }).getAttribute('href')).toBe(
      '/text?to=on&return=%2Fresources%3Fq%3Dmeal',
    )
  })

  it('offers the full version back in text-only mode', () => {
    render(<FeedFooter feed={stored} text />)
    expect(screen.getByRole('link', { name: 'Full version, with pictures' }).getAttribute('href')).toBe(
      '/text?to=off&return=%2F',
    )
  })
})
