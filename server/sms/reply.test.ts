import { describe, expect, it } from 'vitest'
import { keyword, smsLanguage, smsLimit, smsReply } from './reply.ts'

const places = [
  { name: 'Shower trailer', address: '2350 Ashland St, Ashland', phone: '541-631-2235' },
  { name: 'Location not shared', address: 'Location not published. Call the provider.', phone: null },
]

const CONFIRM = 'Hours and rules change. Confirm before you go.'

describe('smsReply', () => {
  it('keeps the answer short, crisis numbers first, with each place’s address and phone once', () => {
    const text = smsReply(
      { text: `Crisis: call 911 or 988.\n\nTheir website lists showers.\n\n${CONFIRM}`, crisis: true },
      [...places, places[0] as (typeof places)[number]],
      'en',
    )
    expect(text.startsWith('Crisis: call 911 or 988.')).toBe(true)
    expect(text.match(/Shower trailer, 2350 Ashland St, Ashland, 541-631-2235/g)).toHaveLength(1)
    expect(text).toContain(CONFIRM)
    expect(text).toContain('ashlanddailyhelp.com')
    expect(text.length).toBeLessThanOrEqual(smsLimit(text))
  })

  it('trims a long answer to fit, keeping the crisis line, the reminder and the link', () => {
    const text = smsReply(
      { text: `Crisis: call 911.\n\n${'Long words here. '.repeat(80)}\n\n${CONFIRM}`, crisis: true },
      places,
      'en',
    )
    expect(text.length).toBeLessThanOrEqual(smsLimit(text))
    expect(smsLimit(text)).toBe(459)
    expect(text.startsWith('Crisis: call 911.')).toBe(true)
    expect(text).toContain(CONFIRM)
    expect(text.endsWith('ashlanddailyhelp.com')).toBe(true)
  })

  it('stays within three segments in Spanish too, using plain punctuation', () => {
    const text = smsReply(
      {
        text: `${'Su página web dice que hay duchas los martes. '.repeat(20)}\n\nLos horarios cambian. Confirme antes de ir.`,
        crisis: false,
      },
      places,
      'es',
    )
    expect(smsLimit(text)).toBe(201)
    expect(text.length).toBeLessThanOrEqual(201)
    expect(text).not.toMatch(/[…’]/)
  })
})

describe('smsLanguage', () => {
  it('answers in the language the person writes in', () => {
    expect(smsLanguage('Where can I shower?')).toBe('en')
    expect(smsLanguage('¿Dónde puedo bañarme?')).toBe('es')
    expect(smsLanguage('necesito comida hoy')).toBe('es')
    expect(smsLanguage('tengo hambre')).toBe('es')
    expect(smsLanguage('busco refugio para dormir esta noche')).toBe('es')
    expect(smsLanguage('Is there hay for horses?')).toBe('en')
  })
})

describe('keyword', () => {
  it('knows STOP, START and HELP, in either language and any case', () => {
    expect(keyword(' stop ')).toBe('stop')
    expect(keyword('UNSUBSCRIBE')).toBe('stop')
    expect(keyword('Start')).toBe('start')
    expect(keyword('help')).toBe('help')
    expect(keyword('AYUDA')).toBe('help')
    expect(keyword('help me find food')).toBeNull()
  })
})
