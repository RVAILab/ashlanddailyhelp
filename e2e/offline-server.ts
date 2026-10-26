import { readFileSync, writeFileSync } from 'node:fs'

// The preview server reads the secrets the build copied from .dev.vars. Chat calls go to a closed local port instead
// of Anthropic, so a journey never reaches the network or spends money; the answer falls back as when Claude is down.
const path = 'build/server/.dev.vars'
const kept = readFileSync(path, 'utf8')
  .split('\n')
  .filter(line => line && !/^ANTHROPIC_(API_KEY|BASE_URL)=/.test(line))
writeFileSync(path, [...kept, "ANTHROPIC_API_KEY='e2e'", "ANTHROPIC_BASE_URL='http://127.0.0.1:9'", ''].join('\n'))
