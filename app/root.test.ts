import { describe, expect, it } from 'vitest'
import { shipsJavaScript } from './root.tsx'

describe('shipsJavaScript', () => {
  it('leaves out the scripts only when a matched route asks', () => {
    expect(shipsJavaScript([undefined, { hydrate: false }])).toBe(false)
    expect(shipsJavaScript([undefined, undefined])).toBe(true)
    expect(shipsJavaScript([{ hydrate: true }, null])).toBe(true)
  })
})
