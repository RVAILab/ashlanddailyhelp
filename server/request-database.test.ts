import { afterEach, describe, expect, it } from 'vitest'
import { testDatabase } from '../test/db.ts'
import { databaseUrl, requestDatabase } from './request-database.ts'

describe('databaseUrl', () => {
  it('prefers the Hyperdrive binding over DATABASE_URL', () => {
    expect(
      databaseUrl({ HYPERDRIVE: { connectionString: 'postgres://hyperdrive' }, DATABASE_URL: 'postgres://direct' }),
    ).toBe('postgres://hyperdrive')
  })

  it('falls back to DATABASE_URL, then to nothing', () => {
    expect(databaseUrl({ DATABASE_URL: 'postgres://direct' })).toBe('postgres://direct')
    expect(databaseUrl({})).toBeUndefined()
  })
})

describe('requestDatabase', () => {
  const pending: Promise<unknown>[] = []
  const waitUntil = (promise: Promise<unknown>) => {
    pending.push(promise)
  }
  const opened: string[] = []
  let closed = 0
  const open = async () => {
    const db = await testDatabase()
    return (url: string) => {
      opened.push(url)
      return {
        db,
        close: async () => {
          closed++
        },
      }
    }
  }
  afterEach(() => {
    pending.length = 0
    opened.length = 0
    closed = 0
  })

  it('opens nothing when no database is configured', async () => {
    const request = requestDatabase(undefined, waitUntil, await open())
    expect(request.database()).toBeNull()
    expect(request.finish(new Response('ok'))).toBeInstanceOf(Response)
    expect(opened).toEqual([])
  })

  it('connects on first use only, and reuses the connection', async () => {
    const request = requestDatabase('postgres://db', waitUntil, await open())
    expect(opened).toEqual([])
    expect(request.database()).toBe(request.database())
    expect(opened).toEqual(['postgres://db'])
  })

  it('never closes a connection it did not open', async () => {
    const request = requestDatabase('postgres://db', waitUntil, await open())
    request.finish(new Response('ok'))
    await Promise.all(pending)
    expect(closed).toBe(0)
  })

  it('closes the connection only after a streamed body has been sent', async () => {
    const request = requestDatabase('postgres://db', waitUntil, await open())
    request.database()
    let push: ReadableStreamDefaultController<Uint8Array> | undefined
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        push = controller
      },
    })
    const response = request.finish(new Response(body, { status: 201, headers: { 'X-Test': 'kept' } }))
    expect(response.status).toBe(201)
    expect(response.headers.get('X-Test')).toBe('kept')

    push?.enqueue(new TextEncoder().encode('streamed'))
    const reader = response.body?.getReader()
    await reader?.read()
    expect(closed).toBe(0)

    push?.close()
    await reader?.read()
    await Promise.all(pending)
    expect(closed).toBe(1)
  })

  it('closes straight away for a response without a body, or when the request fails', async () => {
    const empty = requestDatabase('postgres://db', waitUntil, await open())
    empty.database()
    empty.finish(new Response(null, { status: 204 }))

    const failed = requestDatabase('postgres://db', waitUntil, await open())
    failed.database()
    failed.close()

    await Promise.all(pending)
    expect(closed).toBe(2)
  })
})
