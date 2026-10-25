import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Providers, { handle } from './providers.tsx'

describe('/providers', () => {
  it('finds a provider’s listings and links each to its check page', async () => {
    const data = {
      name: 'ohra',
      listings: [{ id: 'ohra-showers', name: 'A shower and a fresh start', provider: 'OHRA' }],
    }
    const Stub = createRoutesStub([{ path: '/providers', Component: Providers, loader: () => data }])
    render(<Stub initialEntries={['/providers?name=ohra']} />)
    expect((await screen.findByRole('searchbox', { name: 'Organization name' })).getAttribute('value')).toBe('ohra')
    expect(screen.getByRole('link', { name: /A shower and a fresh start/ }).getAttribute('href')).toBe(
      '/report?listing=ohra-showers',
    )
    expect(handle).toEqual({ hydrate: false })
  })

  it('says when nothing matches', async () => {
    const Stub = createRoutesStub([
      { path: '/providers', Component: Providers, loader: () => ({ name: 'zzz', listings: [] }) },
    ])
    render(<Stub initialEntries={['/providers?name=zzz']} />)
    expect(await screen.findByText('No listings match that name.')).toBeDefined()
  })
})
