import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { select } from 'd3-selection'

// Core
import { XYContainer } from '@/containers/xy-container'
import { Crosshair } from '@/components/crosshair'
import { Scatter } from '@/components/scatter'
import { GroupedBar } from '@/components/grouped-bar'
import { StackedBar } from '@/components/stacked-bar'
import * as groupedBarStyles from '@/components/grouped-bar/style'
import { ScatterPoint } from '@/components/scatter/types'
import * as scatterStyles from '@/components/scatter/style'

// Types
import { ScaleDimension } from '@/types/scale'
import { CrosshairCircle } from '@/components/crosshair/types'

// Config
import { CrosshairConfigInterface } from '@/components/crosshair/config'
import { CrosshairSnapMode } from '@/components/crosshair/constants'

type Datum = { x: number; a: number; b: number; c: number | undefined }
type CrosshairInternals = {
  getCircleData: (datum: Datum, datumIndex: number, seriesIndex?: number) => CrosshairCircle[];
  getPaintOrder: (circles: CrosshairCircle[]) => CrosshairCircle[];
}

const datum: Datum = { x: 5, a: 10, b: 20, c: 70 }
const datumIndex = 5
const colors = ['#3b82f6', '#f59e0b', '#10b981']

function getCircles (config: CrosshairConfigInterface<Datum>, colorKeys?: string[]): CrosshairCircle[] {
  const crosshair = new Crosshair<Datum>({
    x: d => d.x,
    yStacked: [d => d.a, d => d.b],
    y: [d => d.c],
    ...config,
  })
  if (colorKeys) crosshair.colorKeys = colorKeys
  return (crosshair as unknown as CrosshairInternals).getCircleData(datum, datumIndex)
}

describe('Crosshair circles with both `yStacked` and `y`', () => {
  it('passes the circle index to `color`, `strokeColor` and `strokeWidth` alike', () => {
    const circles = getCircles({
      color: (d, i) => colors[i],
      strokeColor: (d, i) => colors[i],
      strokeWidth: (d, i) => i + 1,
    })

    expect(circles.map(c => c.color)).toEqual(colors)
    expect(circles.map(c => c.strokeColor)).toEqual(colors)
    expect(circles.map(c => c.strokeWidth)).toEqual([1, 2, 3])
  })

  it('looks up the stroke color key by the circle index', () => {
    const circles = getCircles({
      color: 'none',
      strokeColor: (d, i, key) => key,
    }, ['a', 'b', 'c'])

    expect(circles.map(c => c.strokeColor)).toEqual(['a', 'b', 'c'])
  })

  it('reads the stacked values with the datum index', () => {
    const circles = getCircles({
      yStacked: [(d, i) => i === datumIndex ? d.a : undefined, (d, i) => i === datumIndex ? d.b : undefined],
    })

    expect(circles.map(c => c.opacity)).toEqual([1, 1, 1])
  })

  it('moves the circles by the offsets of the points, by the circle index', () => {
    const crosshair = new Crosshair<Datum>({})
    crosshair.accessors = { x: d => d.x, y: [d => d.c], yStacked: [d => d.a, d => d.b], baseline: undefined }
    crosshair.pointOffset = (index, circleIndex) => (circleIndex === 2 ? { circle: [index, -index], lines: [0, 0] } : undefined)

    const circles = (crosshair as unknown as CrosshairInternals).getCircleData(datum, datumIndex)
    expect(circles.map(c => c.offset)).toEqual([undefined, undefined, [5, -5]])
  })

  it('keeps only the circle of the series under the pointer', () => {
    const crosshair = new Crosshair<Datum>({ x: d => d.x, yStacked: [d => d.a, d => d.b], y: [d => d.c], color: (d, i) => colors[i] })
    const circles = (crosshair as unknown as CrosshairInternals).getCircleData(datum, datumIndex, 1)
    expect(circles.map(c => c.color)).toEqual([colors[1]])
  })

  it('ignores the offsets of the points when the accessors are configured on the Crosshair', () => {
    const circles = getCircles({})
    expect(circles.every(c => c.offset === undefined)).toBe(true)
  })
})

describe('Crosshair circles paint order', () => {
  const paintOrder = (d: Pick<Datum, 'a' | 'b' | 'c'>, yMax = 2000): string[] => {
    const crosshair = new Crosshair<Datum>({ x: d => d.x, yStacked: [d => d.a, d => d.b], y: [d => d.c], circleRadius: 5 })
    crosshair.setScaleDomain(ScaleDimension.Y, [0, yMax])
    crosshair.setScaleRange(ScaleDimension.Y, [300, 0])
    const internals = crosshair as unknown as CrosshairInternals
    const circles = internals.getCircleData({ x: 0, ...d }, 0)
    return internals.getPaintOrder(circles).map(c => c.id)
  }

  it('paints a thick segment over a thin one stacked on top of it', () => {
    expect(paintOrder({ a: 1600, b: 3, c: undefined })).toEqual(['stacked-1', 'stacked-0'])
  })

  it('paints the largest of the tiny segments near zero last', () => {
    expect(paintOrder({ a: 0.01, b: 0.03, c: 0.02 })).toEqual(['stacked-0', 'regular-0', 'stacked-1'])
  })

  it('keeps the order when the circles do not overlap', () => {
    expect(paintOrder({ a: 100, b: 700, c: 1500 })).toEqual(['stacked-0', 'stacked-1', 'regular-0'])
  })

  it('does not reorder the circles returned by `getCircleData`', () => {
    const crosshair = new Crosshair<Datum>({ x: d => d.x, yStacked: [d => d.a, d => d.b], y: [d => d.c], circleRadius: 5 })
    crosshair.setScaleDomain(ScaleDimension.Y, [0, 2000])
    crosshair.setScaleRange(ScaleDimension.Y, [300, 0])
    const circles = (crosshair as unknown as CrosshairInternals).getCircleData({ x: 0, a: 1600, b: 3, c: 1599 }, 0)
    expect(circles.map(c => c.id)).toEqual(['stacked-0', 'stacked-1', 'regular-0'])
  })
})

function mouseMove (target: Element, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
}

const isShown = <T>(crosshair: Crosshair<T>): boolean => crosshair.g.style('opacity') === '1'

type SwarmDatum = { x: number; y: number }
type RenderedPoint = { index: number; x: number; y: number }

function renderSwarm (spreadAxis: 'x' | 'y', snapMode: `${CrosshairSnapMode}`): {
  svg: SVGSVGElement; scatter: Scatter<SwarmDatum>; crosshair: Crosshair<SwarmDatum>; points: RenderedPoint[]; onCrosshairMove: ReturnType<typeof vi.fn>;
} {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const scatter = new Scatter<SwarmDatum>({ x: d => d.x, y: d => d.y, size: 20, spreadAxis })
  const onCrosshairMove = vi.fn()
  const crosshair = new Crosshair<SwarmDatum>({ snapMode, duration: 0, onCrosshairMove })
  const data = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }]
  const container = new XYContainer<SwarmDatum>(element, { width: 500, height: 300, xDomain: [0, 10], yDomain: [0, 10], components: [scatter], crosshair }, data)
  container.render(0)
  vi.advanceTimersToNextFrame()

  const points = scatter.g.selectAll<SVGGElement, ScatterPoint<SwarmDatum>>(`.${scatterStyles.point}`).nodes().map(node => {
    const [x, y] = select(node).attr('transform').match(/translate\(([^,]+),([^)]+)\)/).slice(1).map(Number)
    return { index: select<SVGGElement, ScatterPoint<SwarmDatum>>(node).datum()._point.pointIndex, x, y }
  })
  return { svg: container.svg.node() as SVGSVGElement, scatter, crosshair, points, onCrosshairMove }
}

function pointAt (svg: SVGSVGElement, crosshair: Crosshair<SwarmDatum>, onCrosshairMove: ReturnType<typeof vi.fn>, [x, y]: [number, number]): {
  index: number; circle: [number, number]; lineX: number;
} {
  mouseMove(svg, x, y)
  vi.advanceTimersToNextFrame()
  const circle = crosshair.g.select('circle')
  return {
    index: onCrosshairMove.mock.lastCall[2],
    circle: [Number(circle.attr('cx')), Number(circle.attr('cy'))],
    lineX: Number(crosshair.line.attr('x1')),
  }
}

describe('Crosshair over spread Scatter points', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each(['x', 'y'] as const)('snaps to the point under the pointer along `spreadAxis: %s`, keeping the line at its value', spreadAxis => {
    const { svg, scatter, crosshair, points, onCrosshairMove } = renderSwarm(spreadAxis, CrosshairSnapMode.XY)
    const valueX = Math.round(scatter.xScale(5))
    const valueY = scatter.yScale(5)
    const [outermost] = points.sort((a, b) => Math.hypot(b.x - valueX, b.y - valueY) - Math.hypot(a.x - valueX, a.y - valueY))
    expect(Math.hypot(outermost.x - valueX, outermost.y - valueY)).toBeGreaterThan(10)

    const { index, circle, lineX } = pointAt(svg, crosshair, onCrosshairMove, [outermost.x, outermost.y])
    expect(index).toBe(outermost.index)
    expect(circle[0]).toBeCloseTo(outermost.x)
    expect(circle[1]).toBeCloseTo(outermost.y)
    expect(lineX).toBe(valueX)
  })

  it('responds over the part of a large point that sticks out of the Y scale', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const scatter = new Scatter<SwarmDatum>({ x: d => d.x, y: d => d.y, size: 60 })
    const crosshair = new Crosshair<SwarmDatum>({ snapMode: CrosshairSnapMode.XY, duration: 0 })
    const container = new XYContainer<SwarmDatum>(element, { width: 500, height: 300, components: [scatter], crosshair }, [{ x: 1, y: 10 }, { x: 2, y: 0 }])
    container.render(0)
    vi.advanceTimersToNextFrame()

    const top = scatter.yScale(10) - 20
    expect(top).toBeLessThan(Math.min(...scatter.yScale.range()))
    mouseMove(container.svg.node(), scatter.xScale(1), top)
    vi.advanceTimersToNextFrame()
    expect(isShown(crosshair)).toBe(true)
  })

  it('draws the circle on the snapped point when snapping along X only', () => {
    const { svg, scatter, crosshair, points, onCrosshairMove } = renderSwarm('y', CrosshairSnapMode.X)
    const { index, circle, lineX } = pointAt(svg, crosshair, onCrosshairMove, [points[0].x, points[0].y])
    const snapped = points.find(p => p.index === index)
    expect(circle[0]).toBeCloseTo(snapped.x)
    expect(circle[1]).toBeCloseTo(snapped.y)
    expect(lineX).toBe(Math.round(scatter.xScale(5)))
  })
})

type BarDatum = { x: number; a: number; b: number; c: number }
type RenderedBar = { index: number; seriesIndex: number; x: number; top: number }

/** `xDomain: null` leaves the domain to the data */
function renderGroupedBars (snapMode: `${CrosshairSnapMode}`, xDomain: [number, number] | null = [0, 3], crosshairConfig: CrosshairConfigInterface<BarDatum> = {}): {
  svg: SVGSVGElement; bars: GroupedBar<BarDatum>; crosshair: Crosshair<BarDatum>; rendered: RenderedBar[]; onCrosshairMove: ReturnType<typeof vi.fn>;
} {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const bars = new GroupedBar<BarDatum>({ x: d => d.x, y: [d => d.a, d => d.b, d => d.c], roundedCorners: false })
  const onCrosshairMove = vi.fn()
  const crosshair = new Crosshair<BarDatum>({ snapMode, showHorizontalLine: true, duration: 0, onCrosshairMove, ...crosshairConfig })
  const data = [{ x: 1, a: 30, b: 60, c: 10 }, { x: 2, a: 50, b: 20, c: 40 }]
  const container = new XYContainer<BarDatum>(element, { width: 500, height: 300, xDomain: xDomain ?? undefined, yDomain: [0, 100], components: [bars], crosshair }, data)
  container.render(0)
  vi.advanceTimersToNextFrame()

  const rendered = bars.g.selectAll<SVGGElement, BarDatum>(`.${groupedBarStyles.barGroup}`).nodes().flatMap((group, index) => {
    const [groupX] = select(group).attr('transform').match(/translate\(([^,]+),([^)]+)\)/).slice(1).map(Number)
    return [...group.querySelectorAll(`.${groupedBarStyles.bar}`)].map((path, seriesIndex) => {
      const [, x, top, width] = path.getAttribute('d').match(/^M([^,]+),([^h]+)h([^a]+)a/).map(Number)
      return { index, seriesIndex, x: groupX + x + width / 2, top }
    })
  })
  return { svg: container.svg.node() as SVGSVGElement, bars, crosshair, rendered, onCrosshairMove }
}

describe('Crosshair over grouped bars', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const getCircles = (crosshair: Crosshair<BarDatum>): [number, number][] => crosshair.g.selectAll<SVGCircleElement, unknown>('circle').nodes()
    .map(circle => [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))])

  it('snaps to the bar under the pointer, putting the circle on its end and the lines through it', () => {
    const { svg, crosshair, rendered, onCrosshairMove } = renderGroupedBars(CrosshairSnapMode.XY)
    const bar = rendered.find(b => b.index === 0 && b.seriesIndex === 2)
    mouseMove(svg, bar.x, bar.top)
    vi.advanceTimersToNextFrame()

    const [[cx, cy], ...rest] = getCircles(crosshair)
    expect(rest).toEqual([])
    expect(Math.abs(cx - bar.x)).toBeLessThan(1)
    expect(cy).toBeCloseTo(bar.top)
    expect(Math.abs(Number(crosshair.line.attr('x1')) - bar.x)).toBeLessThan(1)
    expect(Math.abs(Number(crosshair.lineHorizontal.attr('y1')) - bar.top)).toBeLessThan(1)
    expect(onCrosshairMove.mock.lastCall.slice(1, 3)).toEqual([{ x: 1, a: 30, b: 60, c: 10 }, 0])
    expect(onCrosshairMove.mock.lastCall[4]).toBe(2)
  })

  it('snaps to the bar under the pointer even far from its end', () => {
    const { svg, bars, crosshair, rendered, onCrosshairMove } = renderGroupedBars(CrosshairSnapMode.XY)
    const bar = rendered.find(b => b.index === 0 && b.seriesIndex === 1)
    const nearBase = bars.yScale(0) - 5
    expect(nearBase - bar.top).toBeGreaterThan(crosshair.config.hideWhenFarFromPointerDistance)
    mouseMove(svg, bar.x, nearBase)
    vi.advanceTimersToNextFrame()

    expect(isShown(crosshair)).toBe(true)
    expect(onCrosshairMove.mock.lastCall[4]).toBe(1)
    expect(getCircles(crosshair)[0][1]).toBeCloseTo(bar.top)
  })

  it('picks the bar whose column the pointer is in, even right next to a taller neighbour', () => {
    const { svg, crosshair, rendered, onCrosshairMove } = renderGroupedBars(CrosshairSnapMode.XY)
    const short = rendered.find(b => b.index === 0 && b.seriesIndex === 2)
    const tall = rendered.find(b => b.index === 0 && b.seriesIndex === 1)
    expect(short.top - tall.top).toBeGreaterThan(Math.abs(short.x - tall.x))
    mouseMove(svg, short.x, tall.top)
    vi.advanceTimersToNextFrame()

    expect(isShown(crosshair)).toBe(true)
    expect(onCrosshairMove.mock.lastCall[4]).toBe(2)
    expect(getCircles(crosshair)[0][1]).toBeCloseTo(short.top)
  })

  it('responds over the bars that stick out of the X scale into the bleed', () => {
    const { svg, bars, crosshair, rendered, onCrosshairMove } = renderGroupedBars(CrosshairSnapMode.XY, null)
    const bar = rendered.find(b => b.index === 1 && b.seriesIndex === 2)
    expect(bar.x).toBeGreaterThan(Math.max(...bars.xScale.range()))
    mouseMove(svg, bar.x, bar.top + 5)
    vi.advanceTimersToNextFrame()

    expect(isShown(crosshair)).toBe(true)
    expect(onCrosshairMove.mock.lastCall.slice(2, 3)).toEqual([1])
    expect(onCrosshairMove.mock.lastCall[4]).toBe(2)
  })

  it('still hides outside of the plot area', () => {
    const { svg, crosshair } = renderGroupedBars(CrosshairSnapMode.XY, null)
    mouseMove(svg, (crosshair as unknown as { _width: number })._width + 5, 100)
    vi.advanceTimersToNextFrame()
    expect(isShown(crosshair)).toBe(false)
  })

  it('follows the pointer into the bleed without snapping to data', () => {
    const { svg, bars, crosshair, rendered } = renderGroupedBars(CrosshairSnapMode.X, null, { snapToData: false })
    const bar = rendered.find(b => b.index === 1 && b.seriesIndex === 2)
    mouseMove(svg, bar.x, 150)
    vi.advanceTimersToNextFrame()

    expect(bar.x).toBeGreaterThan(Math.max(...bars.xScale.range()))
    expect(isShown(crosshair)).toBe(true)
    expect(Math.abs(Number(crosshair.line.attr('x1')) - bar.x)).toBeLessThan(1)
  })

  it('puts every circle of the group on its bar when snapping along X, keeping the line in the middle of the group', () => {
    const { svg, bars, crosshair, rendered } = renderGroupedBars(CrosshairSnapMode.X)
    const group = rendered.filter(b => b.index === 0)
    mouseMove(svg, group[2].x, group[2].top)
    vi.advanceTimersToNextFrame()

    const circles = getCircles(crosshair)
    expect(circles).toHaveLength(3)
    circles.forEach(([cx, cy], i) => {
      expect(Math.abs(cx - group[i].x)).toBeLessThan(1)
      expect(cy).toBeCloseTo(group[i].top)
    })
    expect(Number(crosshair.line.attr('x1'))).toBe(Math.round(bars.xScale(1)))
  })
})

function renderStackedBars (): {
  svg: SVGSVGElement; bars: StackedBar<BarDatum>; crosshair: Crosshair<BarDatum>; onCrosshairMove: ReturnType<typeof vi.fn>;
} {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const bars = new StackedBar<BarDatum>({ x: d => d.x, y: [d => d.a, d => d.b, d => d.c] })
  const onCrosshairMove = vi.fn()
  const crosshair = new Crosshair<BarDatum>({ snapMode: CrosshairSnapMode.XY, duration: 0, onCrosshairMove })
  const data = [{ x: 1, a: 10, b: 10, c: 10 }, { x: 2, a: 100, b: 20, c: 20 }]
  const container = new XYContainer<BarDatum>(element, { width: 500, height: 300, xDomain: [0, 3], yDomain: [0, 150], components: [bars], crosshair }, data)
  container.render(0)
  vi.advanceTimersToNextFrame()
  return { svg: container.svg.node() as SVGSVGElement, bars, crosshair, onCrosshairMove }
}

describe('Crosshair over stacked bars', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const pointAt = (svg: SVGSVGElement, onCrosshairMove: ReturnType<typeof vi.fn>, x: number, y: number): [number, number] => {
    mouseMove(svg, x, y)
    vi.advanceTimersToNextFrame()
    return [onCrosshairMove.mock.lastCall[2], onCrosshairMove.mock.lastCall[4]]
  }

  it('picks the whole column under the pointer, far from the top of the stack too', () => {
    const { svg, bars, crosshair, onCrosshairMove } = renderStackedBars()
    const nearBase = bars.yScale(5)
    expect(nearBase - bars.yScale(140)).toBeGreaterThan(crosshair.config.hideWhenFarFromPointerDistance)
    expect(pointAt(svg, onCrosshairMove, bars.xScale(2), nearBase)).toEqual([1, undefined])
    expect(isShown(crosshair)).toBe(true)
    expect(crosshair.g.selectAll('circle').size()).toBe(3)
  })

  it('picks the column the pointer is in, even right next to the top of a taller one', () => {
    const { svg, bars, onCrosshairMove } = renderStackedBars()
    expect(pointAt(svg, onCrosshairMove, bars.xScale(1), bars.yScale(140))).toEqual([0, undefined])
  })
})
