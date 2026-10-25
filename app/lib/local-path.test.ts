import { describe, expect, it } from 'vitest'
import { localReturn } from './local-path.ts'

const site = 'https://ashlanddailyhelp.com'

describe('localReturn', () => {
  it('keeps a path on this site, with its query and fragment', () => {
    expect(localReturn('/resources?q=shower#ohra-showers', site, '/list')).toBe('/resources?q=shower#ohra-showers')
  })

  it('refuses anything that would leave the site, whatever browsers would strip from it', () => {
    for (const away of [
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      'https://evil.example/',
      'javascript:alert(1)',
      ' //evil.example',
    ])
      expect(localReturn(away, site, '/list')).toBe('/list')
    expect(localReturn(null, site, '/list')).toBe('/list')
  })
})
