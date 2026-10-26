// Loads the feed into DATABASE_URL by hand: npm run feed:ingest -- <feed URL or folder> (default: the steward's live feed).
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runIngest } from '../server/feed/run.ts'

const target = process.argv[2] ?? 'https://steward.ashlanddailyhelp.com/feed/'
const remote = /^https?:\/\//.test(target)
const baseUrl = remote ? target : pathToFileURL(`${resolve(target)}/`).href

const readLocal: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (url.protocol !== 'file:') return fetch(input, init)
  // A folder without a file stands in for a host that doesn't publish it (events and alerts are optional).
  const body = await readFile(fileURLToPath(url)).catch(() => null)
  return body
    ? new Response(body, { headers: { 'Content-Type': 'application/json' } })
    : new Response('not found', { status: 404 })
}

const outcome = await runIngest(
  { FEED_BASE_URL: baseUrl, DATABASE_URL: process.env.DATABASE_URL },
  { fetch: readLocal },
)
if (outcome?.result !== 'stored' && outcome?.result !== 'unchanged') process.exit(1)
