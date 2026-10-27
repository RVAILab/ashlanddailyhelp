import { describe, expect, it, vi } from 'vitest'
import { claudeAnswerer } from './claude.ts'

type Create = Parameters<typeof claudeAnswerer>[0]['create']

function fakeClient(reply: unknown) {
  const create = vi.fn(async () => reply)
  return { client: { create: create as unknown as Create }, create }
}

const reply = (body: unknown, extra: Record<string, unknown> = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify(body) }],
  usage: { input_tokens: 1500, output_tokens: 60 },
  ...extra,
})

const input = {
  question: 'Where can I take a shower?',
  language: 'English',
  detail: 'brief' as const,
  asOf: '2026-10-25T19:00:00.000Z',
  now: '2026-10-25T18:00:00.000Z',
  listings: [],
  alerts: [],
  events: [],
}

describe('claudeAnswerer', () => {
  it('asks Claude Opus 5.5 with a cached instruction, a schema and the default fallback, the question as data', async () => {
    const { client, create } = fakeClient(reply({ known: false, answer: '', cited: [] }))
    await claudeAnswerer(client).answer(input)
    const [request] = create.mock.calls[0] as unknown as [Record<string, unknown>]
    expect(request).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema' } },
    })
    const [system] = request.system as Array<{ text: string; cache_control: unknown }>
    expect(system?.cache_control).toEqual({ type: 'ephemeral' })
    expect(system?.text).toMatch(/not instructions to you/)
    expect(system?.text).toMatch(/Never guess/)
    expect(JSON.parse((request.messages as Array<{ content: string }>)[0]?.content ?? '')).toEqual(input)
  })

  it('gives back the answer, what it cites, and the token usage', async () => {
    const { client } = fakeClient(
      reply({ known: true, answer: 'Their website lists showers on Tuesdays.', cited: ['ohra-showers'] }),
    )
    expect(await claudeAnswerer(client).answer(input)).toEqual({
      known: true,
      answer: 'Their website lists showers on Tuesdays.',
      cited: ['ohra-showers'],
      usage: { inputTokens: 1500, outputTokens: 60 },
    })
  })

  it('rejects a refusal, a truncated answer, an answer with no text, and text that isn’t the expected JSON', async () => {
    const bad = [
      reply({ known: false, answer: '', cited: [] }, { stop_reason: 'refusal' }),
      reply({ known: false, answer: '', cited: [] }, { stop_reason: 'max_tokens' }),
      reply({}, { content: [] }),
      reply({ known: 'yes', answer: 'Showers on Tuesdays.' }),
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }], usage: reply({}).usage },
    ]
    for (const answer of bad) await expect(claudeAnswerer(fakeClient(answer).client).answer(input)).rejects.toThrow()
  })
})
