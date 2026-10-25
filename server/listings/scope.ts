// The prototype covers Ashland: services there, and county-wide or statewide services that include it (Oct 25).
export const SERVED_PLACES = ['Ashland', 'Jackson County', 'Oregon']

export const servesAshland = (area: string, coverage: readonly string[] = []) =>
  [area, ...coverage].some(place => SERVED_PLACES.includes(place))
