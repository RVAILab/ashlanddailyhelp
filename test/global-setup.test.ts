import { describe, expect, it } from 'vitest'
import { refreshFixtures } from './global-setup.ts'

describe('the test run setup', () => {
  it('uses the committed live snapshot in CI, however old, without asking the steward', async () => {
    expect(await refreshFixtures({ CI: 'true' })).toEqual({ result: 'cached' })
  })
})
