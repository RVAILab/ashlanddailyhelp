import { type ActionFunctionArgs, RouterContextProvider } from 'react-router'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Answerer } from '../../server/chat/claude.ts'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { services } from '../context.ts'
import { action } from './navigator.tsx'

describe('/navigator action', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storeListings(db)
  })
  afterAll(() => db.close())

  it('answers at full depth', async () => {
    const asked: string[] = []
    const answerer: Answerer = {
      answer: async input => {
        asked.push(input.detail)
        return {
          known: true,
          answer: 'Their website lists photo ID.',
          cited: ['access-pantries'],
          usage: { inputTokens: 1, outputTokens: 1 },
        }
      },
    }
    const context = new RouterContextProvider()
    context.set(services, { database: () => db, answerer })
    const url = new URL('https://ashlanddailyhelp.com/navigator')
    const request = new Request(url, { method: 'POST', body: new URLSearchParams({ q: 'food pantry requirements' }) })
    const result = await action({ request, url, pattern: '/navigator', params: {}, context } as ActionFunctionArgs)
    expect(result.state).toBe('answered')
    expect(asked).toEqual(['full'])
  })
})
