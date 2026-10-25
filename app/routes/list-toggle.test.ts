import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './list-toggle.ts'

const toggle = (search: string, cookie = '') =>
  loader(loaderArgs(`https://ashlanddailyhelp.com/list/toggle${search}`, {}, { Cookie: cookie }))

describe('/list/toggle', () => {
  it('adds a listing to the saved list and goes back', () => {
    const response = toggle('?id=ohra-showers&return=%2Fresources%3Fq%3Dshower', 'saved=uncle-foods')
    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/resources?q=shower')
    expect(response.headers.get('Set-Cookie')).toBe(
      'saved=uncle-foods.ohra-showers; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly; Secure',
    )
  })

  it('removes a listing already saved', () => {
    expect(toggle('?id=uncle-foods&return=%2Flist', 'saved=uncle-foods').headers.get('Set-Cookie')).toContain('saved=;')
  })

  it('only returns to pages on this site, and ignores a bad id', () => {
    expect(toggle('?id=ohra-showers&return=%2F%2Fevil.example').headers.get('Location')).toBe('/list')
    const bad = toggle('?id=BAD%20ID&return=%2Flist')
    expect(bad.headers.get('Set-Cookie')).toBeNull()
  })
})

describe('/list/toggle, from the review', () => {
  it('refuses a return address that browsers would turn into another site', () => {
    expect(toggle('?id=ohra-showers&return=%2F%09%2Fevil.example').headers.get('Location')).toBe('/list')
  })

  it('changes nothing when another website sends someone here', () => {
    const response = loader(
      loaderArgs(
        'https://ashlanddailyhelp.com/list/toggle?id=ohra-showers&return=%2Flist',
        {},
        { Cookie: '', 'Sec-Fetch-Site': 'cross-site' },
      ),
    )
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })
})
