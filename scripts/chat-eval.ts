// Runs the chat evaluation set (eval/chat.json) through the real answering service, against the sample feed in a
// throwaway database: npm run chat:eval. Needs ANTHROPIC_API_KEY (in .dev.vars) and costs a few cents a run.
import { readFile } from 'node:fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import { answerQuestion } from '../server/chat/answer.ts'
import { claudeAnswerer } from '../server/chat/claude.ts'
import { currentListings } from '../server/feed/listings.ts'
import { testDatabase } from '../test/db.ts'
import { storeListings } from '../test/listings.ts'

interface Case {
  question: string
  lang: 'en' | 'es'
  cites?: string[]
  citesAny?: string[]
  unknown?: boolean
  orUnknown?: boolean
  crisis?: boolean
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('chat:eval needs ANTHROPIC_API_KEY (put it in .dev.vars)')
  process.exit(1)
}

const cases: Case[] = JSON.parse(await readFile('eval/chat.json', 'utf8'))
const db = await testDatabase()
await storeListings(db)
const answerer = claudeAnswerer(new Anthropic({ timeout: 60_000, maxRetries: 1 }).beta.messages)
const now = new Date('2026-10-25T18:00:00Z')
const squash = (text: string) => text.toLowerCase().replace(/[\s.]/g, '')
const sources = new Map((await currentListings(db, now)).map(listing => [listing.id, squash(JSON.stringify(listing))]))

// A time of day in an answer must appear in a listing it cites, so a made-up time fails.
const times = (text: string) => text.toLowerCase().match(/\b\d{1,2}(:\d{2})?\s?(am|pm|a\.m\.|p\.m\.)/g) ?? []

let failed = 0
for (const test of cases) {
  const reply = await answerQuestion({ db, answerer, question: test.question, lang: test.lang, now })
  const cited = reply.citations.map(citation => citation.id)
  const problems: string[] = []
  const unknownOk = test.orUnknown && !reply.known
  if (test.unknown && (reply.known || !reply.text.includes('211'))) problems.push('should say unknown and point to 211')
  if (test.crisis && !(reply.crisis && reply.text.search(/\d/) === reply.text.indexOf('911')))
    problems.push('should put the crisis numbers first')
  if (!unknownOk && test.cites?.some(id => !cited.includes(id))) problems.push(`should cite ${test.cites.join(', ')}`)
  if (!unknownOk && test.citesAny && !test.citesAny.some(id => cited.includes(id)))
    problems.push(`should cite one of ${test.citesAny.join(', ')}`)
  for (const time of times(reply.text))
    if (!cited.some(id => sources.get(id)?.includes(squash(time))))
      problems.push(`says "${time}", which no cited listing does`)
  if (problems.length) failed++
  console.log(`${problems.length ? 'FAIL' : 'pass'}  ${test.question}`)
  for (const problem of problems) console.log(`      ${problem}`)
  if (problems.length)
    console.log(`      cited: ${cited.join(', ') || 'nothing'}\n      answer: ${reply.text.replace(/\n+/g, ' ')}`)
}
await db.close()
console.log(`\n${cases.length - failed} of ${cases.length} passed`)
process.exit(failed ? 1 : 0)
