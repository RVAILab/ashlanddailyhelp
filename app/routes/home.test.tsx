import { render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n/provider.tsx'
import Home, { handle } from './home.tsx'

function renderHome(lang: 'en' | 'es' = 'en') {
  const Stub = createRoutesStub([{ path: lang === 'es' ? '/es' : '/', Component: Home }])
  render(
    <I18nProvider lang={lang}>
      <Stub initialEntries={[lang === 'es' ? '/es' : '/']} />
    </I18nProvider>,
  )
}

describe('homepage', () => {
  it('puts the emergency and crisis numbers first, each one tap to call', async () => {
    renderHome()
    const numbers = await screen.findByRole('navigation', { name: 'Emergency and crisis numbers' })
    const links = within(numbers).getAllByRole('link')
    expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['911Emergency', 'tel:911'],
      ['988Mental health or suicide crisis', 'tel:988'],
      ['211Help finding services', 'tel:211'],
    ])
    const [first] = document.querySelectorAll('a')
    expect(first?.getAttribute('href')).toBe('tel:911')
  })

  it('offers each kind of help as a large way into search', async () => {
    renderHome()
    const kinds = await screen.findByRole('region', { name: 'What do you need?' })
    const links = within(kinds).getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/resources?category=food',
      '/resources?category=housing',
      '/resources?category=hygiene',
      '/resources?category=health',
      '/resources?category=essentials',
      '/resources',
    ])
    expect(within(kinds).getByRole('link', { name: /Food/ }).textContent).toBe('FoodMeals and groceries')
  })

  it('has smaller ways in for people helping someone, providers, and the public', async () => {
    renderHome()
    const others = await screen.findByRole('region', { name: 'Other ways in' })
    expect(
      within(others)
        .getByRole('link', { name: 'Helping someone else? Search and share listings' })
        .getAttribute('href'),
    ).toBe('/resources')
    expect(within(others).getByRole('link', { name: 'Run a service? How listings work' }).getAttribute('href')).toBe(
      '/about#providers',
    )
    expect(within(others).getByRole('link', { name: 'About Daily Help' }).getAttribute('href')).toBe('/about')
  })

  it('is in Spanish under /es, with Spanish links', async () => {
    renderHome('es')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Encuentre ayuda en Ashland y el condado de Jackson' }),
    ).toBeDefined()
    expect(screen.getByRole('navigation', { name: 'Números de emergencia y de crisis' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Comida/ }).getAttribute('href')).toBe('/es/resources?category=food')
    expect(screen.getByRole('link', { name: 'Acerca de Daily Help' }).getAttribute('href')).toBe('/es/about')
  })

  it('ships no JavaScript, since it is only links and text', () => {
    expect(handle).toEqual({ hydrate: false })
  })
})
