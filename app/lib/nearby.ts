export interface Point {
  lat: number
  lng: number
}

const EARTH_MILES = 3958.8
const radians = (degrees: number) => (degrees * Math.PI) / 180

export function milesBetween(a: Point, b: Point): number {
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h))
}

// About 20 minutes a mile; past two miles a bus or a ride makes more sense than a walking time.
export const walkMinutes = (miles: number) => (miles <= 2 ? Math.max(1, Math.round(miles * 20)) : null)

export function byDistance<Card extends { geo?: Point }>(cards: Card[], from: Point) {
  const measured = cards.map(card => ({ card, miles: card.geo ? milesBetween(from, card.geo) : null }))
  const known = measured.filter(entry => entry.miles !== null).sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0))
  return [...known, ...measured.filter(entry => entry.miles === null)]
}
