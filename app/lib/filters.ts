import { Category } from '../../contract/steward/values.ts'
import type { ListingFilters } from '../../server/listings/search.ts'

const text = (value: string | null, max: number) => value?.trim().slice(0, max) || undefined

export function readFilters(params: URLSearchParams): ListingFilters {
  const category = Category.safeParse(params.get('category'))
  const filters: ListingFilters = {}
  const query = text(params.get('q'), 100)
  const area = text(params.get('area'), 80)
  if (query) filters.query = query
  if (category.success) filters.category = category.data
  if (area) filters.area = area
  return filters
}

export function filtersSearch(filters: ListingFilters): string {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.category) params.set('category', filters.category)
  if (filters.area) params.set('area', filters.area)
  const search = params.toString()
  return search ? `?${search}` : ''
}
