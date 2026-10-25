import { describe, expect, it } from 'vitest'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './home.tsx'

describe('homepage loader', () => {
  it('shows the art, unless in text-only mode', async () => {
    expect((await loader(loaderArgs('/'))).data.art).toBe(true)
    expect((await loader(loaderArgs('/', {}, { 'Save-Data': 'on' }))).data.art).toBe(false)
    expect((await loader(loaderArgs('/', {}, { Cookie: 'text=on' }))).data.art).toBe(false)
  })
})
