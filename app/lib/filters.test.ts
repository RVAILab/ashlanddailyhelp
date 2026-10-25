import { describe, expect, it } from 'vitest'
import { filtersSearch, readFilters } from './filters.ts'

describe('readFilters', () => {
  it('reads words and a known category from the query string, ignoring an area (the site covers Ashland)', () => {
    expect(readFilters(new URLSearchParams('q=+hot+meal+&category=food&area=Ashland'))).toEqual({
      query: 'hot meal',
      category: 'food',
    })
  })

  it('ignores an unknown category and empty values, and bounds the length', () => {
    expect(readFilters(new URLSearchParams('q=&category=pizza'))).toEqual({})
  })
})

describe('filtersSearch', () => {
  it('writes the filters back as a query string, leaving out what is unset', () => {
    expect(filtersSearch({ query: 'hot meal', category: 'food' })).toBe('?q=hot+meal&category=food')
    expect(filtersSearch({})).toBe('')
  })
})
