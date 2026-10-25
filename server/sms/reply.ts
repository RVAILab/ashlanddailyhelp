import { type Lang, messagesFor } from '../../app/i18n/index.ts'
import { whereText } from '../../app/lib/listing-detail.ts'

const LINK = 'ashlanddailyhelp.com'
// The basic SMS alphabet (GSM-7). A text using anything else, such as á, í, ó or ú, is sent in a wider encoding that
// fits far fewer characters in each segment.
const GSM = /^[A-Za-z0-9 \n\r@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/

// Three segments: 459 characters of the basic alphabet, or 201 of anything wider.
export const smsLimit = (text: string) => (GSM.test(text) ? 459 : 201)

// Typographic punctuation would push a whole text out of the basic alphabet, so it is written plainly.
const plain = (text: string) =>
  text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[–—]/g, '-')

export interface SmsPlace {
  name: string
  address: string
  phone: string | null
}

const SPANISH =
  /[¿¡ñáéíóú]|\b(donde|puedo|necesito|tengo|busco|quiero|comida|comer|hambre|hoy|mañana|noche|esta|ayuda|refugio|albergue|dormir|ducha|ropa|para|por favor|gracias|hola)\b/i

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
  const cut = text.slice(0, Math.max(0, room - 3))
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}...`
}

// The answer as one short text: the crisis line first, then the answer, each place's name, address and phone, the
// reminder to confirm, and the site. Only the answer is shortened to fit; everything else is always kept.
export function smsReply(answer: { text: string; crisis: boolean }, places: SmsPlace[], lang: Lang): string {
  const confirm = messagesFor(lang).chat.confirm
  const paragraphs = answer.text.split(/\n{2,}/).filter(paragraph => paragraph.trim() !== confirm)
  const crisis = answer.crisis ? (paragraphs.shift() ?? null) : null
  const lines = [
    ...new Set(
      places
        .slice(0, 4)
        .map(place => [place.name, whereText(place.address, lang), place.phone].filter(Boolean).join(', ')),
    ),
  ].slice(0, 3)
  const known = answer.text.includes(confirm)
  const build = (body: string) =>
    plain([crisis, body, ...lines, known ? confirm : null, `More: ${LINK}`].filter(Boolean).join('\n'))
  const full = build(paragraphs.join(' '))
  const limit = smsLimit(full)
  if (full.length <= limit) return full
  const room = limit - build('').length - 1
  return build(shorten(plain(paragraphs.join(' ')), Math.max(0, room)))
}
