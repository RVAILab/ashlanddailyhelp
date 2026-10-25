import { afterEach, describe, expect, it } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './health.ts'

describe('/health', () => {
  const opened: Array<{ close: () => Promise<void> }> = []
  afterEach(async () => {
    await Promise.all(opened.splice(0).map(db => db.close()))
  })

  it('reports ok when the database answers', async () => {
    const db = await testDatabase()
    opened.push(db)
    const response = await loader(loaderArgs('/health', { database: () => db }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, database: 'ok' })
  })

  it('reports unavailable with a 503 when the database query fails', async () => {
    const db = await testDatabase()
    await db.close()
    const response = await loader(loaderArgs('/health', { database: () => db }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, database: 'unavailable' })
  })

  it('reports not configured with a 503 when there is no database', async () => {
    const response = await loader(loaderArgs('/health'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, database: 'not_configured' })
  })
})
