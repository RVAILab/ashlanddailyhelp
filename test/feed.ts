import { readFileSync } from 'node:fs'

export function sampleListingsFeed() {
  return JSON.parse(readFileSync('test/fixtures/feed-sample/listings.json', 'utf8'))
}

type Reply = Response | Error | ((request: Request) => Response)

// A stand-in for the feed host: answers each request with the next reply, and records what was asked.
export function feedHost(...replies: Reply[]) {
  const requests: Request[] = []
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init)
    requests.push(request)
    const reply = replies.shift()
    if (!reply) throw new Error(`no reply left for ${request.url}`)
    if (reply instanceof Error) throw reply
    return typeof reply === 'function' ? reply(request) : reply
  }
  return { fetch, requests }
}

export function json(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
