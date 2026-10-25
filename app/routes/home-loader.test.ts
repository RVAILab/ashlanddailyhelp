import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { headers, loader } from './home.tsx'

describe('homepage loader', () => {
  it('shows the art, unless the browser asks to save data', async () => {
    const shown = await loader(loaderArgs('/'))
    expect(shown.data.art).toBe(true)
    const saving = await loader(loaderArgs('/', {}, { 'Save-Data': 'on' }))
    expect(saving.data.art).toBe(false)
  })

  it('varies on Save-Data as well as on what the layout varies on', () => {
    const parentHeaders = new Headers({ Vary: 'Accept-Language, Cookie' })
    const result = new Headers(headers({ parentHeaders } as Parameters<typeof headers>[0]))
    expect(result.get('Vary')).toBe('Accept-Language, Cookie, Save-Data')
  })
})
