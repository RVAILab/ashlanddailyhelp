import { createRequestHandler, RouterContextProvider } from 'react-router'
import { services } from '../app/context.ts'
import { runIngest } from '../server/feed/run.ts'
import { databaseUrl, requestDatabase } from '../server/request-database.ts'

const requestHandler = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE)

export default {
  async fetch(request, env, ctx) {
    const db = requestDatabase(databaseUrl(env), promise => ctx.waitUntil(promise))
    const context = new RouterContextProvider()
    context.set(services, { database: db.database })
    try {
      return db.finish(await requestHandler(request, context))
    } catch (error) {
      db.close()
      throw error
    }
  },

  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runIngest(env))
  },
} satisfies ExportedHandler<Env>
