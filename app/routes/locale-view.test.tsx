import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from './home.tsx'
import Locale from './locale.tsx'

function renderAt(url: string, lang: 'en' | 'es') {
  const feed = { state: 'none' } as const
  const Stub = createRoutesStub([
    {
      path: '/:lang?',
      Component: Locale,
      loader: () => ({ lang, feed }),
      children: [{ index: true, Component: Home }],
    },
  ])
  render(<Stub initialEntries={[url]} />)
}

describe('the language layout', () => {
  it('offers the other language on every page, named in that language, returning to the same page', async () => {
    renderAt('/?x=1', 'en')
    const link = await screen.findByRole('link', { name: 'Español' })
    expect(link.getAttribute('href')).toBe('/language?to=es&return=%2F%3Fx%3D1')
    expect(link.getAttribute('lang')).toBe('es')
    expect(link.getAttribute('hreflang')).toBe('es')
  })

  it('puts the page and its links in Spanish under /es', async () => {
    renderAt('/es', 'es')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ashland Daily Help' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Buscar ayuda' }).getAttribute('href')).toBe('/es/resources')
    expect(screen.getByRole('link', { name: 'English' }).getAttribute('lang')).toBe('en')
    expect(within(screen.getByRole('contentinfo')).getByText('La lista todavía no se ha cargado.')).toBeDefined()
  })
})
