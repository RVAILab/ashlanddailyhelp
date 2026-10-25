import { createContext } from 'react-router'
import type { Database } from '../server/db.ts'

export interface AppServices {
  database: () => Database | null
}

export const services = createContext<AppServices>()
