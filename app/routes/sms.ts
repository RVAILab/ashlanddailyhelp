import { answerQuestion } from '../../server/chat/answer.ts'
import { findListing } from '../../server/listings/listing.ts'
import { keyword, smsLanguage, smsReply } from '../../server/sms/reply.ts'
import { validTwilioSignature, within } from '../../server/sms/twilio.ts'
import { services } from '../context.ts'
import { messagesFor } from '../i18n/index.ts'
import type { Route } from './+types/sms'

const escapeXml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const twiml = (message: string | null) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>${message === null ? '<Response/>' : `<Response><Message>${escapeXml(message)}</Message></Response>`}`,
    { headers: { 'Content-Type': 'text/xml; charset=utf-8' } },
  )

// The rate limit needs to tell senders apart, not know who they are, so it sees only a keyed hash of the number: a
// plain hash of a phone number can be reversed by trying every number.
async function senderKey(from: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`sms:${from}`))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// Twilio waits 15 seconds for a reply and then gives up, sending nothing, so a slow answer becomes the 211 answer.
const ANSWER_WITHIN = 12_000

// Twilio's messaging webhook. Each text is answered from the directory (story 25); nothing about the sender is kept.
export async function action({ request, context }: Route.ActionArgs) {
  const { database, answerer, askAllowed, smsAuthToken } = context.get(services)
  const db = database()
  if (!smsAuthToken || !answerer || !db) return new Response('Text messages are not set up yet.', { status: 503 })
  const params = Object.fromEntries(
    [...(await request.formData()).entries()].map(([key, value]) => [key, String(value)]),
  )
  if (!(await validTwilioSignature(request.url, params, request.headers.get('X-Twilio-Signature'), smsAuthToken)))
    return new Response('Not signed by the provider.', { status: 403 })
  const body = (params.Body ?? '').trim().slice(0, 300)
  const lang = smsLanguage(body)
  const t = messagesFor(lang).sms
  switch (keyword(body)) {
    case 'stop':
      return twiml(null)
    case 'start':
      return twiml(t.start)
    case 'help':
      return twiml(t.help)
  }
  if (!body) return twiml(t.help)
  if (askAllowed && !(await askAllowed(await senderKey(params.From ?? '', smsAuthToken)))) return twiml(t.limited)
  const now = new Date()
  const answer = await within(ANSWER_WITHIN, answerQuestion({ db, answerer, question: body, lang, now }))
  if (!answer) {
    console.error('sms: no answer within', ANSWER_WITHIN, 'ms')
    return twiml(smsReply({ text: messagesFor(lang).chat.unknown, crisis: false }, [], lang))
  }
  const places = (
    await Promise.all(
      answer.citations.map(citation => (citation.listingId ? findListing(db, citation.listingId, now) : null)),
    )
  ).flatMap(listing => (listing ? [{ name: listing.name, address: listing.address, phone: listing.phone }] : []))
  return twiml(smsReply(answer, places, lang))
}
