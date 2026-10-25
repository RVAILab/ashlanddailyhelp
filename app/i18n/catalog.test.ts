import { describe, expect, it } from 'vitest'
import { en } from './en.ts'
import { es } from './es.ts'

type Tree = { [key: string]: unknown }

function leaves(tree: Tree, prefix = ''): Array<[string, unknown]> {
  return Object.entries(tree).flatMap(([key, value]) =>
    value && typeof value === 'object' ? leaves(value as Tree, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  )
}

describe('the message catalogs', () => {
  it('have the same keys in Spanish as in English', () => {
    expect(leaves(es).map(([key]) => key)).toEqual(leaves(en).map(([key]) => key))
  })

  it.each([
    ['English', en],
    ['Spanish', es],
  ])('give non-empty text for every message in %s', (_, catalog) => {
    for (const [key, message] of leaves(catalog)) {
      const numeric = ['search.places', 'nearby.miles', 'nearby.walk'].includes(key)
      const text = typeof message === 'function' ? message(numeric ? 2 : 'Ashland') : message
      expect(typeof text, key).toBe('string')
      expect(String(text).trim(), key).not.toBe('')
    }
  })
})
