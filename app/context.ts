import { createContext } from 'react-router'
import type { Database } from '../server/db.ts'

export interface AppServices {
  database: () => Database | null
  // Where "Request a correction" emails go (the steward's intake); unset, corrections can't be sent online yet.
  correctionsEmail?: string
}

export const services = createContext<AppServices>()
