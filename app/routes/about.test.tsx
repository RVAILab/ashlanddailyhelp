import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n/provider.tsx'
import About, { handle } from './about.tsx'

function renderAbout(lang: 'en' | 'es' = 'en') {
  const path = lang === 'es' ? '/es/about' : '/about'
  const Stub = createRoutesStub([{ path, Component: About }])
  render(
    <I18nProvider lang={lang}>
      <Stub initialEntries={[path]} />
    </I18nProvider>,
  )
}

describe('/about', () => {
  it('explains where listings come from, what the labels mean, privacy, and what providers can do', async () => {
    renderAbout()
    expect(await screen.findByRole('heading', { level: 1, name: 'About Ashland Daily Help' })).toBeDefined()
    for (const name of ['Where the listings come from', 'What the labels mean', 'Your privacy', 'For providers'])
      expect(screen.getByRole('heading', { level: 2, name })).toBeDefined()
    expect(screen.getByRole('heading', { level: 2, name: 'For providers' }).id).toBe('providers')
    expect(screen.getByText('Schedule needs checking')).toBeDefined()
  })

  it('is in Spanish under /es', async () => {
    renderAbout('es')
    expect(await screen.findByRole('heading', { level: 1, name: 'Acerca de Ashland Daily Help' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 2, name: 'Para las organizaciones' }).id).toBe('providers')
  })

  it('ships no JavaScript', () => {
    expect(handle).toEqual({ hydrate: false })
  })
})
