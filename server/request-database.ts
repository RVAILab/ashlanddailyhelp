import { connect, type Database, type DatabaseConnection } from './db.ts'

export function databaseUrl(env: {
  HYPERDRIVE?: { connectionString: string }
  DATABASE_URL?: string
}): string | undefined {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
}

export interface RequestDatabase {
  database: () => Database | null
  finish: (response: Response) => Response
  close: () => void
}

// Workers can't hold a connection between requests, so each request opens one on first use and closes it once the
// response body has been sent: React Router may still be streaming, and querying, after the handler returns.
export function requestDatabase(
  url: string | undefined,
  waitUntil: (promise: Promise<unknown>) => void,
  open: (url: string) => DatabaseConnection = connect,
): RequestDatabase {
  let connection: DatabaseConnection | undefined
  const close = () => {
    if (connection) waitUntil(connection.close())
  }
  return {
    database: () => {
      if (!url) return null
      connection ??= open(url)
      return connection.db
    },
    finish: response => {
      if (!connection) return response
      if (!response.body) {
        close()
        return response
      }
      const { readable, writable } = new TransformStream()
      const opened = connection
      waitUntil(response.body.pipeTo(writable).finally(() => opened.close()))
      return new Response(readable, response)
    },
    close,
  }
}
