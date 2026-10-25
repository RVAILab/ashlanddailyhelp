import { describe, expect, it, vi } from 'vitest'
import { claudeTranslator } from './claude.ts'

type Create = Parameters<typeof claudeTranslator>[0]['create']

function fakeClient(reply: unknown) {
  const create = vi.fn(async () => reply)
  return { client: { create: create as unknown as Create }, create }
}

const answer = (body: unknown, extra: Record<string, unknown> = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify(body) }],
  usage: { input_tokens: 1200, output_tokens: 80, cache_read_input_tokens: 900 },
  ...extra,
})

describe('claudeTranslator', () => {
  const texts = [
    { id: 't1', text: 'Free, according to the provider’s website' },
    { id: 't2', text: 'Photo ID required.' },
  ]

  it('asks Claude Opus 5.5 for Spanish, with a cached instruction, a schema and the default fallback', async () => {
    const { client, create } = fakeClient(
      answer({
        translations: [
          { id: 't1', text: 'Gratis' },
          { id: 't2', text: 'Se requiere identificación con foto.' },
        ],
      }),
    )
    await claudeTranslator(client).translate(texts, 'es')
    const [request] = create.mock.calls[0] as unknown as [Record<string, unknown>]
    expect(request).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema' } },
    })
    const [system] = request.system as Array<{ text: string; cache_control: unknown }>
    expect(system?.cache_control).toEqual({ type: 'ephemeral' })
    expect(system?.text).toMatch(/Translate only/)
    expect(system?.text).toMatch(/ID required/)
    expect(JSON.parse((request.messages as Array<{ content: string }>)[0]?.content ?? '')).toEqual({
      language: 'Spanish',
      texts,
    })
  })

  it('gives back each translation by id, with the token usage', async () => {
    const { client } = fakeClient(
      answer({
        translations: [
          { id: 't2', text: 'Se requiere identificación con foto.' },
          { id: 't1', text: 'Gratis' },
        ],
      }),
    )
    const result = await claudeTranslator(client).translate(texts, 'es')
    expect(result.translations).toEqual(
      new Map([
        ['t1', 'Gratis'],
        ['t2', 'Se requiere identificación con foto.'],
      ]),
    )
    expect(result.usage).toEqual({ inputTokens: 1200, outputTokens: 80, cacheReadTokens: 900 })
  })

  it('rejects a refusal, a truncated answer, a missing or unknown id, and text that isn’t JSON', async () => {
    const bad = [
      answer({ translations: [] }, { stop_reason: 'refusal' }),
      answer({ translations: [] }, { stop_reason: 'max_tokens' }),
      answer({ translations: [{ id: 't1', text: 'Gratis' }] }),
      answer({
        translations: [
          { id: 't1', text: 'Gratis' },
          { id: 't9', text: '?' },
        ],
      }),
      {
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'not json' }],
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    ]
    for (const reply of bad)
      await expect(claudeTranslator(fakeClient(reply).client).translate(texts, 'es')).rejects.toThrow()
  })
})
