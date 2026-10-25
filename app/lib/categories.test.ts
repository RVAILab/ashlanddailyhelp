import { describe, expect, it } from 'vitest'
import { Category } from '../../contract/steward/values.ts'
import { categories } from './categories.ts'

describe('categories', () => {
  it('lists exactly the steward’s categories, in its order', () => {
    expect([...categories]).toEqual(Category.options)
  })
})
