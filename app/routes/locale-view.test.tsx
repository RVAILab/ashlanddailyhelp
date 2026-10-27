import { fireEvent, render, screen, within } from '@testing-library/react'
import { createRoutesStub, Link } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from './home.tsx'
import Locale from './locale.tsx'

const Start = () => (
  <main>
    <h1>Start</h1>
    <Link to="/next">Next page</Link>
  </main>
)

const Next = () => (
  <main>
    <h1>Next</h1>
    <Link to="/plain">Plain page</Link>
  </main>
)

const Plain = () => <main>No heading here</main>

function renderAt(url: string, lang: 'en' | 'es') {
  const feed = { state: 'none' } as const
  const Stub = createRoutesStub([
    {
      path: '/:lang?',
      Component: Locale,
      loader: () => ({ lang, feed }),
      children: [
        {
          index: true,
          Component: Home,
          loader: () => ({
            alerts: [],
            listingNames: {},
            byListing: {},
            closedListings: [],
            closedUntil: {},
            demonstration: false,
            nextEnd: null,
          }),
        },
      ],
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
    expect((await screen.findByRole('link', { name: 'Buscar en todo' })).getAttribute('href')).toBe('/es/resources')
    expect(screen.getByRole('link', { name: 'English' }).getAttribute('lang')).toBe('en')
    expect(within(screen.getByRole('contentinfo')).getByText('La lista todavía no se ha cargado.')).toBeDefined()
  })

  it('moves focus to the new page’s heading after a link inside the site, but not on arrival', async () => {
    const feed = { state: 'none' } as const
    const Stub = createRoutesStub([
      {
        path: '/',
        Component: Locale,
        loader: () => ({ lang: 'en', feed }),
        children: [
          {
            index: true,
            Component: Start,
          },
          {
            path: 'next',
            Component: Next,
          },
          { path: 'plain', Component: Plain },
        ],
      },
    ])
    render(<Stub initialEntries={['/']} />)
    const link = await screen.findByRole('link', { name: 'Next page' })
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: 'Start' }))
    fireEvent.click(link)
    const heading = await screen.findByRole('heading', { level: 1, name: 'Next' })
    expect(document.activeElement).toBe(heading)
    fireEvent.click(screen.getByRole('link', { name: 'Plain page' }))
    expect(await screen.findByText('No heading here')).toBeDefined()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
