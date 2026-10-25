import { execFileSync } from 'node:child_process'

export default function loadSampleFeed() {
  execFileSync('node', ['--env-file-if-exists=.dev.vars', 'scripts/ingest.ts', 'test/fixtures/feed-sample'], {
    stdio: 'inherit',
  })
}
