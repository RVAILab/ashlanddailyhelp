import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './text.ts'

const go = (search: string) => loader(loaderArgs(`https://ashlanddailyhelp.com/text${search}`))

describe('/text', () => {
  it('remembers text-only mode for a year and goes back to the same page', () => {
    const response = go('?to=on&return=%2Fresources%3Fq%3Dmeal')
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/resources?q=meal')
    expect(response.headers.get('Set-Cookie')).toBe('text=on; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
    expect(go('?to=off&return=%2Fes').headers.get('Set-Cookie')).toContain('text=off;')
  })

  it('only returns to pages on this site, and ignores anything but on or off', () => {
    expect(go('?to=on&return=%2F%2Fevil.example').headers.get('Location')).toBe('/')
    expect(go('?to=maybe&return=%2Fabout').headers.get('Set-Cookie')).toBeNull()
  })
})
