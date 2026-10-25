import type { Messages } from '../i18n/en.ts'

export function areaName(area: string, t: Messages): string {
  if (area === 'Jackson County') return t.areas.countyWide(area)
  if (area === 'Oregon') return t.areas.statewide(area)
  return area
}
