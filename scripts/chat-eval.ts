// Runs the chat evaluation set (eval/chat.json) through the real answering service, against the sample feed in a
// throwaway database: npm run chat:eval. Needs ANTHROPIC_API_KEY (in .dev.vars) and costs a few cents a run.
import { readFile } from 'node:fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import { answerQuestion } from '../server/chat/answer.ts'
import { claudeAnswerer } from '../server/chat/claude.ts'
import { alertsFile, currentAlerts } from '../server/feed/alerts.ts'
import { eventsFile, upcomingEvents } from '../server/feed/events.ts'
import { refreshFeedFile } from '../server/feed/ingest.ts'
import { currentListings } from '../server/feed/listings.ts'
import { testDatabase } from '../test/db.ts'
import { storeListings } from '../test/listings.ts'

interface Case {
  question: string
  lang: 'en' | 'es'
  depth?: 'brief' | 'full'
  cites?: string[]
  citesAny?: string[]
  unknown?: boolean
  orUnknown?: boolean
  crisis?: boolean
  mentions?: string
  never?: string
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('chat:eval needs ANTHROPIC_API_KEY (put it in .dev.vars)')
  process.exit(1)
}

const cases: Case[] = JSON.parse(await readFile('eval/chat.json', 'utf8'))
const db = await testDatabase()
await storeListings(db)
// The proposed events and alerts, so questions about them and about cancellations are covered.
for (const [spec, file] of [
  [eventsFile, 'events.json'],
  [alertsFile, 'alerts.json'],
] as const)
  await refreshFeedFile(spec as typeof eventsFile, {
    db,
    baseUrl: 'https://feed.example.org/',
    fetch: async () => new Response(await readFile(`test/fixtures/proposed/${file}`)),
    now: () => new Date('2026-10-25T18:00:00Z'),
  })
const answerer = claudeAnswerer(new Anthropic({ timeout: 60_000, maxRetries: 1 }).beta.messages)
const now = new Date('2026-10-25T18:00:00Z')
// Times of day, written any way ("10 a.m.", "10:00 AM", "7pm"), as "10:00am".
const TIME = /\b(\d{1,2})(?::(\d{2}))?\s?(am|pm|a\.m\.|p\.m\.)/gi
const times = (text: string) =>
  [...text.matchAll(TIME)].map(
    ([, hour, minute, half]) => `${Number(hour)}:${minute ?? '00'}${half?.[0]?.toLowerCase()}m`,
  )
const clock = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  )
// Every time each listing, event and alert states, so a time in an answer must come from something it cites.
const stated = new Map<string, Set<string>>()
const state = (id: string, text: string, instants: Array<string | undefined> = []) =>
  stated.set(id, new Set([...times(text), ...instants.flatMap(iso => (iso ? times(clock(iso)) : []))]))
for (const listing of await currentListings(db, now))
  state(
    listing.id,
    JSON.stringify(listing),
    (listing.openings ?? []).flatMap(window => [window.startsAt, window.endsAt]),
  )
for (const event of await upcomingEvents(db, now))
  state(event.id, JSON.stringify(event), [event.startsAt, event.endsAt])
for (const alert of await currentAlerts(db, now)) state(alert.id, JSON.stringify(alert), [alert.startsAt, alert.endsAt])

let failed = 0
for (const test of cases) {
  const reply = await answerQuestion({ db, answerer, question: test.question, lang: test.lang, now, depth: test.depth })
  const cited = reply.citations.map(citation => citation.id)
  const problems: string[] = []
  const unknownOk = test.orUnknown && !reply.known
  if (test.unknown && (reply.known || !reply.text.includes('211'))) problems.push('should say unknown and point to 211')
  if (test.crisis && !(reply.crisis && reply.text.search(/\d/) === reply.text.indexOf('911')))
    problems.push('should put the crisis numbers first')
  if (!unknownOk && test.cites?.some(id => !cited.includes(id))) problems.push(`should cite ${test.cites.join(', ')}`)
  if (!unknownOk && test.citesAny && !test.citesAny.some(id => cited.includes(id)))
    problems.push(`should cite one of ${test.citesAny.join(', ')}`)
  if (test.mentions && !reply.text.toLowerCase().includes(test.mentions))
    problems.push(`should mention "${test.mentions}"`)
  if (test.never && reply.text.toLowerCase().includes(test.never)) problems.push(`must never say "${test.never}"`)
  for (const time of times(reply.text))
    if (!cited.some(id => stated.get(id)?.has(time))) problems.push(`says ${time}, which nothing it cites does`)
  if (problems.length) failed++
  console.log(`${problems.length ? 'FAIL' : 'pass'}  ${test.question}`)
  for (const problem of problems) console.log(`      ${problem}`)
  if (problems.length)
    console.log(`      cited: ${cited.join(', ') || 'nothing'}\n      answer: ${reply.text.replace(/\n+/g, ' ')}`)
}
await db.close()
console.log(`\n${cases.length - failed} of ${cases.length} passed`)
process.exit(failed ? 1 : 0)
