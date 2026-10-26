import { execFileSync } from 'node:child_process'

export default function prepareDatabase() {
  for (const args of [['scripts/migrate.ts'], ['scripts/ingest.ts', 'test/fixtures/feed-sample']])
    execFileSync('node', ['--env-file-if-exists=.dev.vars', ...args], { stdio: 'inherit' })
}
