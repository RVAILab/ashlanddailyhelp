import { execFileSync } from 'node:child_process'
import { refreshFixtures } from '../test/global-setup.ts'
import { LIVE_FEED_DIR } from '../test/live-feed.ts'

export default async function prepareDatabase() {
  await refreshFixtures()
  for (const args of [['scripts/migrate.ts'], ['scripts/ingest.ts', LIVE_FEED_DIR]])
    execFileSync('node', ['--env-file-if-exists=.dev.vars', ...args], { stdio: 'inherit' })
}
