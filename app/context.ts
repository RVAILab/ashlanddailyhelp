import { createContext } from 'react-router'
import type { Answerer } from '../server/chat/claude.ts'
import type { Database } from '../server/db.ts'

export interface AppServices {
  database: () => Database | null
  // Where "Request a correction" emails go (the steward's intake); unset, corrections can't be sent online yet.
  correctionsEmail?: string
  // Answers chat questions; unset or null when the Worker has no ANTHROPIC_API_KEY, so asking says it's unavailable.
  answerer?: Answerer | null
  // Whether this connection may ask again now (a Workers rate limit); unset, there is no limit (tests, local).
  askAllowed?: (key: string) => Promise<boolean>
}

export const services = createContext<AppServices>()
