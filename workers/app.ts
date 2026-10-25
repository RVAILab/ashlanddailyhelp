import { createRequestHandler, RouterContextProvider } from 'react-router'
import { services } from '../app/context.ts'
import { connect, type DatabaseConnection } from '../server/db.ts'

const requestHandler = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE)

function databaseUrl(env: Env): string | undefined {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
}

export default {
  async fetch(request, env, ctx) {
    let connection: DatabaseConnection | undefined
    const url = databaseUrl(env)
    const context = new RouterContextProvider()
    context.set(services, {
      database: () => {
        if (!url) return null
        connection ??= connect(url)
        return connection.db
      },
    })
    try {
      return await requestHandler(request, context)
    } finally {
      if (connection) ctx.waitUntil(connection.close())
    }
  },
} satisfies ExportedHandler<Env>
