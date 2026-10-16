import { describe, expect, it } from 'vitest'
import { select } from 'd3-selection'

// Types
import { ScaleDimension } from '@/types/scale'
import { Spacing } from '@/types/spacing'

// Local
import { Scatter } from './index'
import { ScatterConfigInterface } from './config'
import { ScatterPoint, ScatterPointGroupNode } from './types'
import { collideLabels } from './modules/utils'
import { updateLabels } from './modules/point'
import * as s from './style'

type Datum = { x: number; y: number; label?: string }

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
  it('reports how far each point is drawn from its values, and nothing without `spreadAxis`', () => {
    const config: ScatterConfigInterface<Datum> = { x: d => d.x, y: d => d.y, size: 20, spreadAxis: 'x' }
    const { scatter, points } = renderScatter(config, categoryData, [0, 2], [0, 100])
    for (const p of points) {
      const { drawn, slot } = scatter.getPointOffset(p.datum._point.pointIndex, 0)
      expect(drawn[0]).toBeCloseTo(p.x - scatter.xScale(p.datum.x))
      expect(drawn[1]).toBe(0)
      expect(slot).toEqual([0, 0])
    }

    const { scatter: unspread } = renderScatter({ ...config, spreadAxis: undefined }, categoryData, [0, 2], [0, 100])
    expect(unspread.getPointOffset(0, 0)).toBeUndefined()
  })

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

  it('keeps every point when spreading, as there are no overlaps to cull', () => {
    const config: ScatterConfigInterface<Datum> = { x: d => d.x, y: d => d.y, size: 6, cullOverlappingPoints: true }
    const { points: culled } = renderScatter(config, categoryData, [-0.5, 2.5], [0, 100])
    const { points: spread } = renderScatter({ ...config, spreadAxis: 'x' }, categoryData, [-0.5, 2.5], [0, 100])
    expect(culled.length).toBeLessThan(categoryData.length)
    expect(spread).toHaveLength(categoryData.length)
    expect(getOverlaps(spread)).toBe(0)
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

const FONT_SIZE = 12

/** Resolves the labels the way the scatter does on the next frame, and reads the outcome off the nodes */
function resolveLabels (scatter: Scatter<Datum>): Record<string, { position: string; visible: boolean; anchor: string | null }> {
  const points = scatter.g.selectAll<SVGGElement, ScatterPoint<Datum>>(`.${s.point}`)
  const labeledPoints = points.filter(d => !!d._point.label)
  collideLabels(points, scatter.xScale, scatter.yScale, FONT_SIZE, { x: 0, y: 0, width: WIDTH, height: HEIGHT })
  updateLabels(labeledPoints, scatter.config)
  return Object.fromEntries(labeledPoints.nodes().map((node: ScatterPointGroupNode) => {
    const label = node.querySelector('text')
    return [select<SVGGElement, ScatterPoint<Datum>>(node).datum().label, {
      position: node._labelPosition,
      visible: node._labelVisible,
      anchor: label.style.textAnchor || null,
    }]
  }))
}

describe('Scatter label positions', () => {
  // 6px per X unit: B sits 30px to the right of A, right where A's label would go
  const neighbours: Datum[] = [{ x: 50, y: 50, label: 'Alpha' }, { x: 55, y: 50, label: 'Bravo' }]
  const config: ScatterConfigInterface<Datum> = { x: d => d.x, y: d => d.y, size: 10, label: d => d.label }

  it('moves a label to the next position when the first one overlaps a point', () => {
    const { scatter } = renderScatter({ ...config, labelPosition: ['right', 'left'] }, neighbours, [0, 100], [0, 100])
    const labels = resolveLabels(scatter)
    expect(labels.Alpha).toEqual({ position: 'left', visible: true, anchor: 'end' })
    expect(labels.Bravo).toEqual({ position: 'right', visible: true, anchor: null })
  })

  it('hides a label with a single position that overlaps, as before', () => {
    const { scatter } = renderScatter({ ...config, labelPosition: 'right' }, neighbours, [0, 100], [0, 100])
    const labels = resolveLabels(scatter)
    expect(labels.Alpha.visible).toBe(false)
    expect(labels.Bravo.visible).toBe(true)
  })

  it('treats the points without labels as obstacles too', () => {
    const { scatter } = renderScatter({ ...config, labelPosition: ['right', 'left'] }, [{ x: 50, y: 50, label: 'Alpha' }, { x: 55, y: 50 }], [0, 100], [0, 100])
    expect(resolveLabels(scatter).Alpha.position).toBe('left')
  })

  it('doesn\'t let a label cover a point even by a couple of pixels', () => {
    // 3px per Y unit: the label's box ends 6px below A's centre, B's circle starts 4px below it
    const data: Datum[] = [{ x: 50, y: 50, label: 'Alpha' }, { x: 55, y: 47, label: 'Bravo' }]
    const { scatter } = renderScatter({ ...config, labelPosition: d => (d.label === 'Alpha' ? ['right', 'left'] : 'bottom') }, data, [0, 100], [0, 100])
    expect(resolveLabels(scatter).Alpha.position).toBe('left')
  })

  it('moves a label out of its point when another point covers it', () => {
    const data: Datum[] = [{ x: 20, y: 50, label: 'Big' }, { x: 24, y: 50 }]
    const size = (d: Datum): number => (d.label ? 80 : 10)
    const { scatter } = renderScatter({ ...config, size, labelPosition: ['center', 'right'] }, data, [0, 100], [0, 100])
    expect(resolveLabels(scatter).Big.position).toBe('right')
  })

  it('lets a label stay inside its point when the point is drawn above the one under it', () => {
    const data: Datum[] = [{ x: 20, y: 50, label: 'Under' }, { x: 24, y: 50, label: 'Over' }]
    const { scatter } = renderScatter({ ...config, size: 80, labelPosition: ['center', 'left'] }, data, [0, 100], [0, 100])
    const labels = resolveLabels(scatter)
    expect(labels.Under.position).toBe('left')
    expect(labels.Over).toMatchObject({ position: 'center', visible: true })
  })

  it('keeps a single central label in place whatever covers it, as before', () => {
    const data: Datum[] = [{ x: 20, y: 50, label: 'Big' }, { x: 24, y: 50 }]
    const size = (d: Datum): number => (d.label ? 80 : 10)
    const { scatter } = renderScatter({ ...config, size, labelPosition: 'center' }, data, [0, 100], [0, 100])
    expect(resolveLabels(scatter).Big).toMatchObject({ position: 'center', visible: true })
  })

  it('skips the fallback positions that leave the chart', () => {
    const atEdge: Datum[] = [{ x: 1, y: 50, label: 'Alpha' }, { x: 6, y: 50, label: 'Bravo' }]
    const { scatter } = renderScatter({ ...config, labelPosition: ['right', 'left'] }, atEdge, [0, 100], [0, 100])
    expect(resolveLabels(scatter).Alpha.visible).toBe(false)
  })

  it('puts a label inside the point only when it can be as large there as outside', () => {
    const data: Datum[] = [{ x: 20, y: 50, label: 'Big' }, { x: 80, y: 50, label: 'Small' }]
    const { scatter } = renderScatter({
      ...config,
      size: d => (d.label === 'Big' ? 80 : 10),
      labelPosition: ['center', 'right'],
    }, data, [0, 100], [0, 100])
    const labels = resolveLabels(scatter)
    expect(labels.Big.position).toBe('center')
    expect(labels.Small.position).toBe('right')
  })

  it('stops the color transition of a label that moves', () => {
    const { scatter } = renderScatter({ ...config, labelPosition: ['center', 'right'] }, [{ x: 50, y: 50, label: 'Alpha' }], [0, 100], [0, 100])
    scatter.render(600)
    const text = scatter.g.select<SVGTextElement>('text').node()
    const getTransitions = (): unknown => (text as unknown as Record<string, unknown>).__transition
    expect(getTransitions()).toBeDefined()
    expect(resolveLabels(scatter).Alpha.position).toBe('right')
    expect(getTransitions()).toBeUndefined()
    expect(text.style.fill).toBe('')
  })
})

