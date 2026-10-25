import { describe, expect, it } from 'vitest'
import { langFromPath, localePath, preferredLang } from './index.ts'

describe('langFromPath', () => {
  it('is Spanish under /es and English elsewhere', () => {
    expect(langFromPath('/es')).toBe('es')
    expect(langFromPath('/es/resources')).toBe('es')
    expect(langFromPath('/')).toBe('en')
    expect(langFromPath('/resources')).toBe('en')
    expect(langFromPath('/estimates')).toBe('en')
  })
})

describe('localePath', () => {
  it('puts a path in a language, keeping the query string', () => {
    expect(localePath('/resources?q=meal', 'es')).toBe('/es/resources?q=meal')
    expect(localePath('/', 'es')).toBe('/es')
    expect(localePath('/es/resources?q=comida', 'en')).toBe('/resources?q=comida')
    expect(localePath('/es', 'en')).toBe('/')
    expect(localePath('/es/resources', 'es')).toBe('/es/resources')
  })
})

describe('preferredLang', () => {
  it('follows a saved choice first', () => {
    expect(preferredLang({ cookie: 'theme=dark; lang=es', acceptLanguage: 'en-US' })).toBe('es')
    expect(preferredLang({ cookie: 'lang=en', acceptLanguage: 'es-MX,es' })).toBe('en')
  })

  it('then prefers Spanish only when the browser ranks it above English', () => {
    expect(preferredLang({ acceptLanguage: 'es-MX,es;q=0.9,en;q=0.8' })).toBe('es')
    expect(preferredLang({ acceptLanguage: 'es' })).toBe('es')
    expect(preferredLang({ acceptLanguage: 'en-US,en;q=0.9,es;q=0.8' })).toBe('en')
    expect(preferredLang({ acceptLanguage: 'fr-FR,fr' })).toBe('en')
    expect(preferredLang({})).toBe('en')
  })

  it('ignores a saved value that is not a language the site has', () => {
    expect(preferredLang({ cookie: 'lang=fr', acceptLanguage: 'es' })).toBe('es')
  })
})
