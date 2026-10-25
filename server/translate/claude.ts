import type Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

export const TRANSLATION_MODEL = 'claude-opus-5-5'

export interface TranslationUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

export interface Translator {
  translate: (
    texts: Array<{ id: string; text: string }>,
    lang: 'es',
  ) => Promise<{ translations: Map<string, string>; usage: TranslationUsage }>
}

const LANGUAGE_NAMES = { es: 'Spanish' } as const

const SYSTEM = `You translate short pieces of text from a directory of free and low-cost services (food, shelter, showers, health care, everyday essentials) in Ashland and Jackson County, Oregon. The readers are people looking for help, many of whom read with difficulty, so a wrong word can send someone to the wrong place or keep them from going.

Translate only. Keep the meaning exactly: do not add, drop, soften, explain or correct anything. When a text says something is not confirmed, unknown or may change, keep that.

Keep these exactly as written: names of organizations, places, programs and buildings; street addresses; phone numbers; web and email addresses; and numbers, days, dates and times (translate the words around them).

For Spanish, use plain everyday words and the formal "usted". Most readers speak Mexican or Mexican-American Spanish.

Use these translations every time:
- "ID required" → "Se requiere identificación"
- "photo ID" → "identificación con foto"
- "walk-in" or "walk-ins welcome" → "sin cita"
- "appointment" → "cita"; "by appointment" → "con cita"
- "free" → "gratis"
- "shower" → "regadera (ducha)"
- "shelter" → "albergue"
- "food pantry" → "despensa de alimentos"
- "Not confirmed" → "No confirmado"
- "Call before you go" → "Llame antes de ir"

You get a JSON object with the target language and a list of texts, each with an id. Return one translation for every text, with the same id.`

const Answer = z.object({ translations: z.array(z.object({ id: z.string(), text: z.string().min(1) })) })

export function claudeTranslator(client: Pick<Anthropic['beta']['messages'], 'create'>): Translator {
  return {
    async translate(texts, lang) {
      const message = await client.create({
        model: TRANSLATION_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: zodOutputFormat(Answer) },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: JSON.stringify({ language: LANGUAGE_NAMES[lang], texts }) }],
      })
      if (message.stop_reason !== 'end_turn') throw new Error(`translation stopped: ${message.stop_reason}`)
      const body = message.content.find(block => block.type === 'text')?.text ?? ''
      let parsed: z.infer<typeof Answer>
      try {
        parsed = Answer.parse(JSON.parse(body))
      } catch {
        throw new Error('translation answer was not the expected JSON')
      }
      const asked = new Set(texts.map(text => text.id))
      const answered = new Map(parsed.translations.map(entry => [entry.id, entry.text]))
      if (answered.size !== asked.size || [...answered.keys()].some(id => !asked.has(id)))
        throw new Error('translation answer did not match the texts asked for')
      return {
        translations: answered,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        },
      }
    },
  }
}
