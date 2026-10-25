import { describe, expect, it } from 'vitest'
import { keyword, SMS_LIMIT, smsLanguage, smsReply } from './reply.ts'

const places = [
  { name: 'Shower trailer', address: '2350 Ashland St, Ashland', phone: '541-631-2235' },
  { name: 'Location not shared', address: 'Location not published. Call the provider.', phone: null },
]

describe('smsReply', () => {
  it('keeps the answer short, crisis numbers first, with each place’s address and phone', () => {
    const text = smsReply(
      { text: 'Crisis: call 911 or 988.\n\nTheir website lists showers.', crisis: true },
      places,
      'en',
    )
    expect(text.startsWith('Crisis: call 911 or 988.')).toBe(true)
    expect(text).toContain('Shower trailer, 2350 Ashland St, Ashland, 541-631-2235')
    expect(text).toContain('ashlanddailyhelp.com')
    expect(text.length).toBeLessThanOrEqual(SMS_LIMIT)
  })

  it('trims a long answer to fit, keeping the crisis line and the link', () => {
    const text = smsReply(
      { text: `Crisis: call 911.\n\n${'Long words here. '.repeat(80)}`, crisis: true },
      places,
      'en',
    )
    expect(text.length).toBeLessThanOrEqual(SMS_LIMIT)
    expect(text.startsWith('Crisis: call 911.')).toBe(true)
    expect(text.endsWith('ashlanddailyhelp.com')).toBe(true)
  })
})

describe('smsLanguage', () => {
  it('answers in the language the person writes in', () => {
    expect(smsLanguage('Where can I shower?')).toBe('en')
    expect(smsLanguage('¿Dónde puedo bañarme?')).toBe('es')
    expect(smsLanguage('necesito comida hoy')).toBe('es')
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
