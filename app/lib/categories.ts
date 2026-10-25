import type { Category } from '../../contract/steward/values.ts'

// The steward's category ids, without importing its zod schema into the browser bundle.
export const categories = ['food', 'housing', 'hygiene', 'health', 'essentials'] as const satisfies readonly Category[]
