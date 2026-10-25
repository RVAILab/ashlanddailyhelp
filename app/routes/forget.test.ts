import { describe, expect, it } from 'vitest'
import { loader } from './forget.ts'

describe('/forget', () => {
  it('clears everything this site keeps on the device, then goes home', () => {
    const response = loader()
    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/?cleared')
    expect(response.headers.get('Clear-Site-Data')).toBe('"cache", "cookies", "storage"')
  })
})
