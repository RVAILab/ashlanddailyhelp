const qualified: Record<string, string> = {
  'Jackson County': 'Jackson County (county-wide)',
  Oregon: 'Oregon (statewide)',
}

export const areaName = (area: string) => qualified[area] ?? area
