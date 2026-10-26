import { describe, expect, it } from 'vitest'
import { es } from './es.ts'

describe('Spanish times built from parts', () => {
  it('uses "a la" for one o’clock and "a las" otherwise', () => {
    expect(es.next.startAt('1:00 p.m.', null)).toBe('a la 1:00 p.m.')
    expect(es.next.startAt('5:00 p.m.', null)).toBe('a las 5:00 p.m.')
    expect(es.today.opensAt('1:30 p.m.')).toBe('Abre a la 1:30 p.m.')
    expect(es.today.workedOut('11:00 a.m.')).toMatch(/^Calculado a las 11:00 a\.m\./)
  })

  it('says tomorrow and weekdays the Spanish way', () => {
    expect(es.next.starts(es.next.startAt('9:00 a.m.', 'mañana'))).toBe('Empieza mañana a las 9:00 a.m.')
    expect(es.next.starts(es.next.startAt('5:00 p.m.', 'martes'))).toBe('Empieza el martes a las 5:00 p.m.')
  })

  it('puts the article after "hasta", and says when an end is tomorrow', () => {
    expect(es.next.openUntil(es.next.endAt('2:00 p.m.', null))).toBe('Abierto ahora, hasta las 2:00 p.m.')
    expect(es.next.startsUntil(es.next.startAt('7:00 p.m.', null), es.next.endAt('7:30 a.m.', 'mañana'))).toBe(
      'Empieza a las 7:00 p.m., hasta las 7:30 a.m. de mañana',
    )
    expect(es.next.endAt('7:30 a.m.', 'martes')).toBe('las 7:30 a.m. del martes')
    expect(es.today.until('1:00 p.m.')).toBe('Abierto hasta la 1:00 p.m.')
    expect(es.today.opensFromTo('9:00 a.m.', '1:00 p.m.')).toBe('Abre a las 9:00 a.m., hasta la 1:00 p.m.')
  })

  it('says the day first when giving when a page was worked out', () => {
    expect(es.next.workedOut('11:00 a.m.', 'domingo, 25 de octubre')).toMatch(
      /^Calculado el domingo, 25 de octubre a las 11:00 a\.m\./,
    )
  })
})
