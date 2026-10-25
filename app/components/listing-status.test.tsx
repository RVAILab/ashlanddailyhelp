import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListingStatus } from './listing-status.tsx'

describe('ListingStatus', () => {
  it('lists each label as words, with a shape for each kind that screen readers skip', () => {
    render(
      <ListingStatus
        labels={[
          { kind: 'warning', text: 'Schedule needs checking' },
          { kind: 'caution', text: 'Not yet confirmed by provider' },
          { kind: 'time', text: 'Ends Mon, Oct 26, 7:30 AM' },
          { kind: 'source', text: 'Source reviewed · Oct 23' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items.map(item => item.textContent?.trim())).toEqual([
      'Schedule needs checking',
      'Not yet confirmed by provider',
      'Ends Mon, Oct 26, 7:30 AM',
      'Source reviewed · Oct 23',
    ])
    const shapes = items.map(item => item.querySelector('svg'))
    expect(shapes.every(shape => shape?.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(new Set(shapes.map(shape => shape?.innerHTML)).size).toBe(4)
  })
})
