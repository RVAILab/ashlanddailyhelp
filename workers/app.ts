import Anthropic from '@anthropic-ai/sdk'
import { createRequestHandler, RouterContextProvider } from 'react-router'
import { services } from '../app/context.ts'
import { claudeAnswerer } from '../server/chat/claude.ts'
import { runIngest } from '../server/feed/run.ts'
import { databaseUrl, requestDatabase } from '../server/request-database.ts'
import { claudeTranslator } from '../server/translate/claude.ts'

const requestHandler = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE)

export default {
  async fetch(request, env, ctx) {
    const db = requestDatabase(databaseUrl(env), promise => ctx.waitUntil(promise))
    const context = new RouterContextProvider()
    context.set(services, {
      database: db.database,
      correctionsEmail: env.CORRECTIONS_EMAIL,
      answerer: env.ANTHROPIC_API_KEY
        ? claudeAnswerer(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 }).beta.messages)
        : null,
      askAllowed: async key => (env.ASK_LIMIT ? (await env.ASK_LIMIT.limit({ key })).success : true),
    })
    try {
      return db.finish(await requestHandler(request, context))
    } catch (error) {
      db.close()
      throw error
    }
  },

  scheduled(_controller, env, ctx) {
    const translator = env.ANTHROPIC_API_KEY
      ? claudeTranslator(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 }).beta.messages)
      : null
    ctx.waitUntil(runIngest(env, { translator }))
  },
} satisfies ExportedHandler<Env>
