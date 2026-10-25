import { describe, expect, it } from 'vitest'
import { byDistance, milesBetween, walkMinutes } from './nearby.ts'

const plaza = { lat: 42.199, lng: -122.7158 }
const resourceCenter = { lat: 42.1876, lng: -122.6839 }

describe('nearby', () => {
  it('measures miles along the ground', () => {
    expect(milesBetween(plaza, plaza)).toBe(0)
    expect(milesBetween(plaza, resourceCenter)).toBeCloseTo(1.8, 1)
  })

  it('gives a walking time only where walking makes sense', () => {
    expect(walkMinutes(0.4)).toBe(8)
    expect(walkMinutes(2)).toBe(40)
    expect(walkMinutes(2.5)).toBeNull()
  })

  it('sorts places by distance, with places whose location isn’t known last, in their order', () => {
    const cards = [
      { id: 'unknown-1' },
      { id: 'far', geo: resourceCenter },
      { id: 'near', geo: { lat: 42.1995, lng: -122.716 } },
      { id: 'unknown-2' },
    ]
    expect(byDistance(cards, plaza).map(({ card, miles }) => [card.id, miles === null])).toEqual([
      ['near', false],
      ['far', false],
      ['unknown-1', true],
      ['unknown-2', true],
    ])
  })
})
