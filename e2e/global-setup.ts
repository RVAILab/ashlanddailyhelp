import { execFileSync } from 'node:child_process'

export default function prepareDatabase() {
  for (const script of ['scripts/migrate.ts', 'scripts/ingest.ts'])
    execFileSync('node', ['--env-file-if-exists=.dev.vars', script], { stdio: 'inherit' })
}
