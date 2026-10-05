import { describe, expect, it } from 'vitest'

// Local
import { spread, SpreadItem, SpreadLayout } from './spread'

const PADDING = 1

/** A swarm on a 300px wide band: a few distinct values and long runs of equal ones, like counts on a log axis */
function createSwarm (count: number, radius: (i: number) => number, extent: [number, number] = [-1e6, 1e6]): SpreadItem[] {
  return Array.from({ length: count }, (_, i) => ({
    anchor: 150,
    value: 10 * Math.round(Math.sqrt(i)),
    radius: radius(i),
    min: extent[0],
    max: extent[1],
  }))
}

function getOverlaps (items: SpreadItem[], { offsets, scale }: SpreadLayout, padding = PADDING): number {
  let overlaps = 0
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const du = (items[i].anchor + offsets[i]) - (items[j].anchor + offsets[j])
      const dv = items[i].value - items[j].value
      const distance = (items[i].radius + items[j].radius + padding) * scale
      if (Math.sqrt(du * du + dv * dv) < distance - 1e-3) overlaps += 1
    }
  }
  return overlaps
}

function isWithinExtents (items: SpreadItem[], { offsets, scale }: SpreadLayout): boolean {
  return items.every((d, i) => {
    const position = d.anchor + offsets[i]
    const radius = d.radius * scale
    return position - radius >= d.min - 1e-3 && position + radius <= d.max + 1e-3
  })
}

describe('spread', () => {
  it('keeps a lone point in place', () => {
    expect(spread(createSwarm(1, () => 5), PADDING)).toEqual({ offsets: [0], scale: 1 })
  })

  it('returns an empty layout for no points', () => {
    expect(spread([], PADDING)).toEqual({ offsets: [], scale: 1 })
  })

  it('separates the points without shrinking them when the extents allow', () => {
    const items = createSwarm(200, i => 3 + (i % 7))
    const layout = spread(items, PADDING)
    expect(layout.scale).toBe(1)
    expect(getOverlaps(items, layout)).toBe(0)
  })

  it('lines equal points up side by side, a diameter and the padding apart', () => {
    const items = createSwarm(5, () => 4).map(d => ({ ...d, value: 0 }))
    const { offsets } = spread(items, PADDING)
    const distances = offsets.map(Math.abs).sort((a, b) => a - b)
    expect(distances).toEqual([0, 9, 9, 18, 18])
  })

  it('places the largest point at its anchor and grows the swarm to both sides', () => {
    const items = createSwarm(9, i => (i === 4 ? 10 : 3)).map(d => ({ ...d, value: 0 }))
    const { offsets } = spread(items, PADDING)
    expect(offsets[4]).toBe(0)
    expect(offsets.filter(o => o < 0)).toHaveLength(4)
    expect(offsets.filter(o => o > 0)).toHaveLength(4)
  })

  it('shrinks the points by one factor to keep them inside their extents', () => {
    const items = createSwarm(200, i => 3 + (i % 7), [100, 200])
    const layout = spread(items, PADDING)
    expect(layout.scale).toBeLessThan(1)
    expect(getOverlaps(items, layout)).toBe(0)
    expect(isWithinExtents(items, layout)).toBe(true)
  })

  it('shrinks only as much as needed', () => {
    const items = createSwarm(200, i => 3 + (i % 7), [100, 200])
    const { scale } = spread(items, PADDING)
    const resize = (factor: number): SpreadItem[] => items.map(d => ({ ...d, radius: d.radius * factor }))
    expect(spread(resize(scale), PADDING * scale).scale).toBe(1)
    expect(spread(resize(scale * 1.02), PADDING * scale * 1.02).scale).toBeLessThan(1)
  })

  it('respects asymmetric extents, like the edge of the plot', () => {
    const items = createSwarm(30, () => 4, [148, 400])
    const layout = spread(items, PADDING)
    expect(layout.scale).toBe(1)
    expect(isWithinExtents(items, layout)).toBe(true)
    expect(getOverlaps(items, layout)).toBe(0)
  })

  it('stops shrinking when the smallest point is a pixel across and clamps the rest into the extents', () => {
    const items = createSwarm(400, () => 4, [149, 151]).map(d => ({ ...d, value: 0 }))
    const layout = spread(items, PADDING)
    expect(layout.scale).toBeCloseTo(1 / 8)
    expect(isWithinExtents(items, layout)).toBe(true)
    expect(getOverlaps(items, layout)).toBeGreaterThan(0)
  })

  it('lays the same points out the same way every time', () => {
    const items = createSwarm(150, i => 2 + (i % 5), [60, 240])
    expect(spread(items, PADDING)).toEqual(spread(items, PADDING))
  })
})
