import type { Category } from '../../contract/steward/values.ts'

// The steward's category ids, without importing its zod schema into the browser bundle.
export const categories = ['food', 'housing', 'hygiene', 'health', 'essentials'] as const satisfies readonly Category[]

export const categoryNames: Record<Category, string> = {
  food: 'Food',
  housing: 'Shelter and housing',
  hygiene: 'Showers and hygiene',
  health: 'Health care',
  essentials: 'Essentials',
}
