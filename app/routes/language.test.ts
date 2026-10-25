import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './language.ts'

const switchTo = (search: string, base = 'https://ashlanddailyhelp.com') =>
  loader(loaderArgs(`${base}/language${search}`))

describe('/language', () => {
  it('remembers the choice for a year and goes to the same page in that language', () => {
    const response = switchTo('?to=es&return=%2Fresources%3Fq%3Dmeal')
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/es/resources?q=meal')
    expect(response.headers.get('Set-Cookie')).toBe('lang=es; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
  })

  it('switches back to English from a Spanish page', () => {
    const response = switchTo('?to=en&return=%2Fes%2Fresources')
    expect(response.headers.get('Location')).toBe('/resources')
    expect(response.headers.get('Set-Cookie')).toContain('lang=en;')
  })

  it('leaves out Secure on plain http, for local development', () => {
    expect(switchTo('?to=es&return=%2F', 'http://localhost:5173').headers.get('Set-Cookie')).not.toContain('Secure')
  })

  it('only returns to pages on this site', () => {
    for (const away of ['https%3A%2F%2Fevil.example', '%2F%2Fevil.example', '%2F%5Cevil.example', 'resources'])
      expect(switchTo(`?to=es&return=${away}`).headers.get('Location')).toBe('/es')
  })

  it('ignores a language the site does not have', () => {
    const response = switchTo('?to=fr&return=%2Fresources')
    expect(response.headers.get('Location')).toBe('/resources')
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })
})
