import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const steward = '../daily-help-steward'

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name).slice(dir.length + 1))
    .sort()
}

describe.skipIf(!existsSync(steward))('the copied steward contract and sample feed', () => {
  it('match the steward checkout (run scripts/sync-steward.sh after it changes)', () => {
    for (const name of ['feed.ts', 'values.ts'])
      expect(readFileSync(`contract/steward/${name}`, 'utf8')).toBe(
        readFileSync(`${steward}/src/contract/${name}`, 'utf8'),
      )
    const sample = `${steward}/fixtures/feed-sample`
    expect(files('test/fixtures/feed-sample')).toEqual(files(sample))
    for (const name of files(sample))
      expect(readFileSync(`test/fixtures/feed-sample/${name}`, 'utf8')).toBe(readFileSync(`${sample}/${name}`, 'utf8'))
  })
})
