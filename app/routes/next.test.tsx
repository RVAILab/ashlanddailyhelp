import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Next, { handle } from './next.tsx'

function renderNext(data: object) {
  const Stub = createRoutesStub([{ path: '/next', Component: Next, loader: () => data }])
  render(<Stub initialEntries={['/next']} />)
}

const meal = {
  name: 'A seat at the community table',
  provider: 'Uncle Foods',
  where: 'Trinity Episcopal Church',
  when: 'Open now, until 1:00 PM',
  phone: '541-555-0100',
  details: '/resources/uncle-foods',
}

describe('/next', () => {
  it('shows the next meal with where, when, a call button and details', async () => {
    renderNext({ workedOut: '11:00 AM', meal, sleep: null, demonstration: false })
    const section = await screen.findByRole('region', { name: 'Next meal' })
    expect(within(section).getByRole('heading', { name: meal.name })).toBeDefined()
    expect(within(section).getByText(meal.where)).toBeDefined()
    expect(within(section).getByText(meal.when)).toBeDefined()
    expect(within(section).getByRole('link', { name: 'Call 541-555-0100' }).getAttribute('href')).toBe('tel:5415550100')
    expect(
      within(section)
        .getByRole('link', { name: /Details/ })
        .getAttribute('href'),
    ).toBe('/resources/uncle-foods')
    expect(handle).toEqual({ hydrate: false })
  })

  it('says plainly when nothing is known, and points to today and 211', async () => {
    renderNext({ workedOut: '11:00 AM', meal: null, sleep: null, demonstration: false })
    expect(await screen.findByText('No meal we know of in the coming week.')).toBeDefined()
    expect(screen.getByText('No place to sleep we know of in the coming week.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Everything open today' }).getAttribute('href')).toBe('/today')
    expect(screen.getAllByRole('link', { name: /211/ }).length).toBeGreaterThan(0)
  })
})
