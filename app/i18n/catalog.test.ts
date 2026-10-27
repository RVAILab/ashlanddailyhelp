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

describe('counted and optional wording', () => {
  it('reads naturally for one, for many and for very short distances, in both languages', () => {
    expect([en.events.finished(1), en.events.finished(3)]).toEqual(['1 event earlier today', '3 events earlier today'])
    expect([es.events.finished(1), es.events.finished(3)]).toEqual([
      '1 evento que ya terminó hoy',
      '3 eventos que ya terminaron hoy',
    ])
    expect([es.pulse.unmet(1), es.pulse.unmet(2)]).toEqual(['1 servicio', '2 servicios'])
    expect([es.list.missing(1), es.list.missing(2)]).toEqual([
      '1 servicio de esta lista ya no está disponible.',
      '2 servicios de esta lista ya no están disponibles.',
    ])
    expect([es.nearby.miles(0.05), es.nearby.miles(1.26)]).toEqual(['A menos de 0.1 millas', '1.3 millas'])
  })

  it('says a cancellation with its note when there is one', () => {
    expect([en.today.canceled(''), en.today.canceled('Staff training')]).toEqual([
      'Canceled today',
      'Canceled today: Staff training',
    ])
    expect([es.today.canceled(''), es.today.canceled('Capacitación')]).toEqual([
      'Cancelado hoy',
      'Cancelado hoy: Capacitación',
    ])
  })
})
