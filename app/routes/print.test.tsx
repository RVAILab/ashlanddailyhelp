import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Print, { handle } from './print.tsx'

describe('/print', () => {
  it('lays out each place with when and what to know, a note to confirm, and a QR code back', async () => {
    const data = {
      title: 'My list',
      backUrl: 'https://ashlanddailyhelp.com/list?ids=ohra-showers',
      qr: '<svg viewBox="0 0 10 10"></svg>',
      asOf: 'Sun, Oct 25, 2026, 12:00 PM PDT',
      rows: [
        {
          id: 'ohra-showers',
          name: 'A shower and a fresh start',
          address: '2350 Ashland St',
          phone: '541-631-2235',
          hours: 'Tue and Thu',
          requirements: 'Not confirmed',
        },
      ],
    }
    const Stub = createRoutesStub([{ path: '/print', Component: Print, loader: () => data }])
    render(<Stub initialEntries={['/print?ids=ohra-showers']} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Ashland Daily Help: My list' })).toBeDefined()
    expect(screen.getByRole('row', { name: /A shower and a fresh start/ })).toBeDefined()
    expect(screen.getByText('Hours and rules change. Call before you go when you can.')).toBeDefined()
    expect(screen.getByRole('img', { name: 'QR code for this page on Ashland Daily Help' })).toBeDefined()
    expect(screen.getByText(data.backUrl)).toBeDefined()
    expect(handle).toEqual({ hydrate: false })
  })
})
