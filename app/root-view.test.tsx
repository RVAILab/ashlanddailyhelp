import { render, screen } from '@testing-library/react'
import { createRoutesStub, data, Outlet } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, Layout } from './root.tsx'

// The layout renders <html> and an inline <script>, which React warns about inside a test's <div>.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

const Root = () => (
  <Layout>
    <Outlet />
  </Layout>
)

const Page = () => (
  <main>
    <h1>A page</h1>
  </main>
)

const Nothing = () => null

function renderLayout(url: string, locale: { origin: string; text: boolean } | null, hydrate: boolean) {
  const Stub = createRoutesStub([
    {
      id: 'root',
      path: '/',
      Component: Root,
      children: [
        {
          id: 'routes/locale',
          path: ':lang?',
          loader: () => locale,
          children: [
            {
              index: true,
              Component: Page,
              handle: hydrate ? undefined : { hydrate: false },
            },
          ],
        },
      ],
    },
  ])
  render(<Stub initialEntries={[url]} />)
}

const alternates = () =>
  [...document.querySelectorAll('link[rel="alternate"]')].map(link => [
    link.getAttribute('hreflang'),
    link.getAttribute('href'),
  ])

describe('the page layout', () => {
  it('names the page’s versions in each language with full addresses, keeping the search', async () => {
    renderLayout('/es?q=comida', { origin: 'https://ashlanddailyhelp.com', text: false }, true)
    await screen.findByRole('heading', { name: 'A page' })
    expect(alternates()).toEqual([
      ['en', 'https://ashlanddailyhelp.com/?q=comida'],
      ['es', 'https://ashlanddailyhelp.com/es?q=comida'],
      ['x-default', 'https://ashlanddailyhelp.com/?q=comida'],
    ])
    expect(document.documentElement.getAttribute('lang')).toBe('es')
    expect(document.documentElement.classList.contains('text-only')).toBe(false)
  })

  it('marks the page text-only when the visitor chose it', async () => {
    renderLayout('/', { origin: 'https://ashlanddailyhelp.com', text: true }, false)
    await screen.findByRole('heading', { name: 'A page' })
    expect(document.documentElement.classList.contains('text-only')).toBe(true)
  })

  it('names no other versions when the page has no language data', async () => {
    renderLayout('/', null, false)
    await screen.findByRole('heading', { name: 'A page' })
    expect(alternates()).toEqual([])
  })

  it('says it is offline in the page’s language, hidden while there is a connection', async () => {
    renderLayout('/es', null, false)
    await screen.findByRole('heading', { name: 'A page' })
    const notice = document.getElementById('offline-notice')
    expect(notice?.textContent).toMatch(/^Está sin conexión/)
    expect(notice?.hidden).toBe(true)
  })
})

function renderError(path: string, error: () => never) {
  const Stub = createRoutesStub([{ path: '/:lang?/:page', loader: error, Component: Nothing, ErrorBoundary }])
  render(<Stub initialEntries={[path]} />)
}

describe('the error page', () => {
  it('says a missing page was not found, with a way home and 211', async () => {
    renderError('/no-such-page', () => {
      throw data('Not found', { status: 404 })
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeDefined()
    expect(screen.getByRole('link', { name: '211' }).getAttribute('href')).toBe('tel:211')
  })

  it('says something went wrong for any other failure, in the page’s language', async () => {
    renderError('/es/resources', () => {
      throw new Error('database down')
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ir a la página principal' }).getAttribute('href')).toBe('/es')
  })
})
