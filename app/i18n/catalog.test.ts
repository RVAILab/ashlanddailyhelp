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

  // Names and words that are the same in both languages; everything else must be real Spanish.
  const SAME = new Set([
    'siteName',
    'brand.name',
    'brand.place',
    'pulse.title',
    'pulse.bar',
    'pulse.totalOnly',
    'next.endAt',
    'sms.help',
    'detail.fields.accessibility',
  ])

  it('leave no English placeholders in Spanish', () => {
    const english = new Map(leaves(en))
    const shown = (message: unknown) =>
      typeof message === 'function' ? String(message(2, 'Ashland', 'Ashland', 3)) : JSON.stringify(message)
    const untranslated = leaves(es)
      .filter(([key, message]) => !SAME.has(key) && shown(message) === shown(english.get(key)))
      .map(([key]) => key)
    expect(untranslated).toEqual([])
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
