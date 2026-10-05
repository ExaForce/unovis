import { describe, expect, it } from 'vitest'
import { select } from 'd3-selection'

// Types
import { ScaleDimension } from '@/types/scale'
import { Spacing } from '@/types/spacing'

// Local
import { Scatter } from './index'
import { ScatterConfigInterface } from './config'
import { ScatterPoint } from './types'
import * as s from './style'

type Datum = { x: number; y: number }

const WIDTH = 600
const HEIGHT = 300

type RenderedPoint = { x: number; y: number; radius: number; datum: ScatterPoint<Datum> }

type RenderedScatter = { scatter: Scatter<Datum>; points: RenderedPoint[]; bleed: Spacing }

/** Renders the scatter the way the container does: sizes and scales first, then `bleed`, which prepares the points */
function renderScatter (config: ScatterConfigInterface<Datum>, data: Datum[], xDomain: [number, number], yDomain: [number, number]): RenderedScatter {
  const scatter = new Scatter<Datum>({ duration: 0, ...config })
  scatter.setData(data)
  scatter.setSize(WIDTH, HEIGHT, WIDTH, HEIGHT)
  scatter.setScaleDomain(ScaleDimension.X, xDomain)
  scatter.setScaleDomain(ScaleDimension.Y, yDomain)
  scatter.setScaleRange(ScaleDimension.X, [0, WIDTH])
  scatter.setScaleRange(ScaleDimension.Y, [HEIGHT, 0])
  const bleed = scatter.bleed
  scatter.render(0)

  const points = scatter.g.selectAll<SVGGElement, ScatterPoint<Datum>>(`.${s.point}`).nodes().map(node => {
    const [x, y] = select(node).attr('transform').match(/translate\(([^,]+),([^)]+)\)/).slice(1).map(Number)
    const datum = select<SVGGElement, ScatterPoint<Datum>>(node).datum()
    return { x, y, radius: datum._point.sizePx / 2, datum }
  })

  return { scatter, points, bleed }
}

function getOverlaps (points: RenderedPoint[]): number {
  let overlaps = 0
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
      if (distance < points[i].radius + points[j].radius - 1e-3) overlaps += 1
    }
  }
  return overlaps
}

/** Three categories of counts: plenty of small equal values and a few large ones */
const categoryData: Datum[] = [0, 1, 2].flatMap(category => Array.from({ length: 40 - 10 * category }, (_, i) => ({
  x: category,
  y: Math.max(1, Math.round(100 / (i + 1))),
})))

describe('Scatter spread', () => {
  it('leaves the points at their values without `spreadAxis`', () => {
    const { scatter, points } = renderScatter({ x: d => d.x, y: d => d.y, size: 20 }, categoryData, [0, 2], [0, 100])
    for (const p of points) {
      expect(p.x).toBeCloseTo(scatter.xScale(p.datum.x))
      expect(p.y).toBeCloseTo(scatter.yScale(p.datum.y))
      expect(p.radius).toBe(10)
    }
  })

  it('moves the points along the spread axis only, so they don\'t overlap', () => {
    const { scatter, points } = renderScatter({ x: d => d.x, y: d => d.y, size: 6, spreadAxis: 'x' }, categoryData, [0, 2], [0, 100])
    expect(points.some(p => Math.abs(p.x - scatter.xScale(p.datum.x)) > 1)).toBe(true)
    for (const p of points) expect(p.y).toBeCloseTo(scatter.yScale(p.datum.y))
    expect(getOverlaps(points)).toBe(0)
  })

  it('keeps every swarm within `spreadMax` of its position, shrinking the points to fit', () => {
    const spreadMax = 0.45
    const { scatter, points } = renderScatter({ x: d => d.x, y: d => d.y, size: 20, spreadAxis: 'x', spreadMax }, categoryData, [-0.5, 2.5], [0, 100])
    const limit = scatter.xScale(spreadMax) - scatter.xScale(0)
    for (const p of points) expect(Math.abs(p.x - scatter.xScale(p.datum.x)) + p.radius).toBeLessThanOrEqual(limit + 1e-3)
    expect(points[0].radius).toBeLessThan(10)
    expect(new Set(points.map(p => p.radius)).size).toBe(1)
    expect(getOverlaps(points)).toBe(0)
  })

  it('spreads along Y, keeping the X values', () => {
    const data = Array.from({ length: 60 }, (_, i) => ({ x: Math.floor(i / 3), y: 0 }))
    const { scatter, points } = renderScatter({ x: d => d.x, y: d => d.y, size: 8, spreadAxis: ScaleDimension.Y }, data, [0, 20], [-1, 1])
    for (const p of points) expect(p.x).toBeCloseTo(scatter.xScale(p.datum.x))
    expect(new Set(points.map(p => Math.round(p.y))).size).toBeGreaterThan(1)
    expect(getOverlaps(points)).toBe(0)
  })

  it('takes exactly the room the edge swarms need once the range has shrunk by it', () => {
    const config: ScatterConfigInterface<Datum> = { x: d => d.x, y: d => d.y, size: 4, spreadAxis: 'x' }
    const { bleed: plain } = renderScatter(config, categoryData, [0, 2], [0, 100])
    const { bleed: bounded } = renderScatter({ ...config, spreadMax: 0.45 }, categoryData, [0, 2], [0, 100])
    const step = (WIDTH - bounded.left - bounded.right) / 2
    expect(plain.left).toBeLessThan(5)
    expect(bounded.left).toBeCloseTo(0.45 * step)
    expect(bounded.right).toBeCloseTo(0.45 * step)
  })

  it('takes no room at the edges when the domain gives every category a slot', () => {
    const config: ScatterConfigInterface<Datum> = { x: d => d.x, y: d => d.y, size: 4, spreadAxis: 'x' }
    for (const spreadMax of [0.05, 0.25, 0.5]) {
      const { bleed } = renderScatter({ ...config, spreadMax }, categoryData, [-0.5, 2.5], [0, 100])
      expect(bleed.left).toBe(0)
      expect(bleed.right).toBe(0)
    }
  })
})
