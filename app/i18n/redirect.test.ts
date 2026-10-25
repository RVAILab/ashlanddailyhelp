import { describe, expect, it } from 'vitest'
import { languageRedirect } from './redirect.ts'

const visit = (path: string, headers: Record<string, string> = {}) =>
  languageRedirect(new URL(path, 'https://ashlanddailyhelp.com'), new Headers(headers))

describe('languageRedirect', () => {
  it('sends a browser that prefers Spanish from an English page to the Spanish one, keeping the search', () => {
    expect(visit('/resources?q=comida', { 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.5' })).toBe(
      '/es/resources?q=comida',
    )
  })

  it('follows a saved choice of Spanish, and leaves a saved choice of English alone', () => {
    expect(visit('/', { Cookie: 'lang=es' })).toBe('/es')
    expect(visit('/', { Cookie: 'lang=en', 'Accept-Language': 'es' })).toBeNull()
  })

  it('leaves navigation within the site alone, so English stays reachable without cookies', () => {
    expect(visit('/', { 'Accept-Language': 'es', 'Sec-Fetch-Site': 'same-origin' })).toBeNull()
    expect(visit('/', { 'Accept-Language': 'es', Referer: 'https://ashlanddailyhelp.com/es' })).toBeNull()
    expect(visit('/', { 'Accept-Language': 'es', Referer: 'https://elsewhere.example/' })).toBe('/es')
  })

  it('never moves a Spanish page', () => {
    expect(visit('/es/resources', { Cookie: 'lang=en', 'Accept-Language': 'en' })).toBeNull()
  })

  it('treats /ES as /es', () => {
    expect(visit('/ES/resources?q=x')).toBe('/es/resources?q=x')
    expect(visit('/Es')).toBe('/es')
  })
})
