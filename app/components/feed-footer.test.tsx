import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedFooter } from './feed-footer.tsx'

describe('FeedFooter', () => {
  it('says when the listings were published, in Pacific time', () => {
    render(<FeedFooter feed={{ generatedAt: '2026-10-25T18:05:00Z', dataset: 'LIVE' }} />)
    expect(screen.getByText('Listings as of Sun, Oct 25, 11:05 AM.')).toBeDefined()
    expect(screen.queryByText(/demonstration/)).toBeNull()
  })

  it('says when the data is a demonstration', () => {
    render(<FeedFooter feed={{ generatedAt: '2026-10-25T18:05:00Z', dataset: 'FICTIONAL_DEMONSTRATION' }} />)
    expect(screen.getByText('This is demonstration data. Some listings are fictional.')).toBeDefined()
  })

  it('says when no listings have loaded yet', () => {
    render(<FeedFooter feed={null} />)
    expect(screen.getByText('Listings have not loaded yet.')).toBeDefined()
  })
})
