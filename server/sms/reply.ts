import type { Lang } from '../../app/i18n/index.ts'
import { whereText } from '../../app/lib/listing-detail.ts'

// Three SMS segments of plain text: long enough for an answer and two or three places, short enough for any phone.
export const SMS_LIMIT = 459
const LINK = 'ashlanddailyhelp.com'

export interface SmsPlace {
  name: string
  address: string
  phone: string | null
}

const SPANISH = /[¿¡ñáéíóú]|\b(dónde|donde|puedo|necesito|comida|hoy|ayuda|quiero|hay|para|por favor|gracias)\b/i

export const smsLanguage = (text: string): Lang => (SPANISH.test(text) ? 'es' : 'en')

const KEYWORDS: Record<string, 'stop' | 'start' | 'help'> = {
  stop: 'stop',
  stopall: 'stop',
  unsubscribe: 'stop',
  cancel: 'stop',
  end: 'stop',
  quit: 'stop',
  start: 'start',
  unstop: 'start',
  help: 'help',
  info: 'help',
  ayuda: 'help',
}

// The whole message as one keyword only; "help me find food" is a question.
export const keyword = (text: string) => KEYWORDS[text.trim().toLowerCase()] ?? null

function shorten(text: string, room: number): string {
  if (text.length <= room) return text
  const cut = text.slice(0, Math.max(0, room - 1))
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}

// The answer as one short text: the crisis line first, then the answer, then each place's name, address and phone,
// then the site. The answer is shortened to fit; the crisis line, the places and the link are kept.
export function smsReply(answer: { text: string; crisis: boolean }, places: SmsPlace[], lang: Lang): string {
  const paragraphs = answer.text.split(/\n{2,}/)
  const crisis = answer.crisis ? (paragraphs.shift() ?? null) : null
  const lines = places
    .slice(0, 3)
    .map(place => [place.name, whereText(place.address, lang), place.phone].filter(Boolean).join(', '))
  const fixed = [crisis, ...lines, `More: ${LINK}`].filter((line): line is string => Boolean(line))
  const room = SMS_LIMIT - fixed.join('\n').length - 2
  const body = shorten(paragraphs.join(' '), room)
  return [crisis, body, ...lines, `More: ${LINK}`].filter(Boolean).join('\n').slice(0, SMS_LIMIT)
}
