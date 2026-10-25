// Loads the feed into DATABASE_URL by hand: npm run feed:ingest -- <feed URL or folder> (default: the sample feed).
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runIngest } from '../server/feed/run.ts'

const target = process.argv[2] ?? 'test/fixtures/feed-sample'
const remote = /^https?:\/\//.test(target)
const baseUrl = remote ? target.replace(/\/?$/, '/') : pathToFileURL(`${resolve(target)}/`).href

const readLocal: typeof fetch = async input => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (url.protocol !== 'file:') return fetch(input)
  return new Response(await readFile(fileURLToPath(url)), { headers: { 'Content-Type': 'application/json' } })
}

const outcome = await runIngest(
  { FEED_BASE_URL: baseUrl, DATABASE_URL: process.env.DATABASE_URL },
  { fetch: readLocal },
)
if (outcome?.result !== 'stored' && outcome?.result !== 'unchanged') process.exit(1)
