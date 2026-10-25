import { describe, expect, it } from 'vitest'
import { listCookie, parseIds, savedIds, toggled } from './saved-list.ts'

describe('the saved list', () => {
  it('reads valid listing ids from the cookie, in order, without repeats', () => {
    expect(savedIds('theme=x; saved=ohra-showers.uncle-foods.ohra-showers.BAD%20ID; lang=en')).toEqual([
      'ohra-showers',
      'uncle-foods',
    ])
    expect(savedIds(null)).toEqual([])
  })

  it('reads a shared list from a comma- or dot-separated query value, capped at 30', () => {
    expect(parseIds('a-1,b-2.c-3')).toEqual(['a-1', 'b-2', 'c-3'])
    expect(parseIds(Array.from({ length: 40 }, (_, i) => `x${i}`).join(','))).toHaveLength(30)
  })

  it('adds an id at the end, or removes it when already there', () => {
    expect(toggled(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggled(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('writes a year-long, HTTP-only, same-site cookie, and clears it when empty', () => {
    expect(listCookie(['a', 'b'], true)).toBe('saved=a.b; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly; Secure')
    expect(listCookie([], false)).toBe('saved=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly')
  })
})
