import { render, screen, within } from '@testing-library/react'
import { createRoutesStub, useLoaderData } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AlertView } from '../lib/alert-view.ts'
import { AlertList } from './alert-list.tsx'

const alert: AlertView = {
  id: 'shelter',
  severity: 'urgent',
  severityText: 'Urgent',
  title: 'Severe weather shelter open Sunday night',
  message: 'The City is opening a shelter.',
  when: 'From Sun 7:00 PM to Mon 7:30 AM',
  status: null,
  listingIds: ['ohra-shelter', 'gone'],
}

function Harness() {
  const alerts = useLoaderData<AlertView[]>()
  return <AlertList alerts={alerts} listingNames={{ 'ohra-shelter': 'Talk through shelter options' }} />
}

function show(alerts: AlertView[]) {
  const Stub = createRoutesStub([{ path: '/', Component: Harness, loader: () => alerts }])
  render(<Stub initialEntries={['/']} />)
}

describe('AlertList', () => {
  it('shows each alert with a severity word and shape, its times, and links to what it names', async () => {
    show([alert])
    const region = await screen.findByRole('region', { name: 'Alerts' })
    const article = within(region).getByRole('article', { name: alert.title })
    expect(within(article).getByText('Urgent')).toBeDefined()
    expect(within(article).getByText('From Sun 7:00 PM to Mon 7:30 AM')).toBeDefined()
    expect(within(article).getByRole('link', { name: 'Talk through shelter options' }).getAttribute('href')).toBe(
      '/resources/ohra-shelter',
    )
    expect(within(article).queryAllByRole('link')).toHaveLength(1)
    expect(region.getAttribute('aria-live')).toBeNull()
  })

  it('shows nothing when there are no alerts', async () => {
    show([])
    expect(screen.queryByRole('region', { name: 'Alerts' })).toBeNull()
  })
})
