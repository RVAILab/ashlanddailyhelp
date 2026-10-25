import { describe, expect, it } from 'vitest'
import { filtersSearch, readFilters } from './filters.ts'

describe('readFilters', () => {
  it('reads words, a known category and an area from the query string', () => {
    expect(readFilters(new URLSearchParams('q=+hot+meal+&category=food&area=Ashland'))).toEqual({
      query: 'hot meal',
      category: 'food',
      area: 'Ashland',
    })
  })

  it('ignores an unknown category and empty values, and bounds the length', () => {
    expect(readFilters(new URLSearchParams(`q=&category=pizza&area=${'x'.repeat(200)}`))).toEqual({
      area: 'x'.repeat(80),
    })
  })
})

describe('filtersSearch', () => {
  it('writes the filters back as a query string, leaving out what is unset', () => {
    expect(filtersSearch({ query: 'hot meal', area: 'Ashland' })).toBe('?q=hot+meal&area=Ashland')
    expect(filtersSearch({})).toBe('')
  })
})
