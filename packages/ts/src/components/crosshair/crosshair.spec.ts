import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { select } from 'd3-selection'

// Core
import { ComponentCore } from '@/core/component'
import { XYContainer } from '@/containers/xy-container'
import { Crosshair } from '@/components/crosshair'
import { Tooltip } from '@/components/tooltip'
import { Scatter } from '@/components/scatter'
import { GroupedBar } from '@/components/grouped-bar'
import { StackedBar } from '@/components/stacked-bar'
import * as groupedBarStyles from '@/components/grouped-bar/style'
import { ScatterPoint } from '@/components/scatter/types'
import * as scatterStyles from '@/components/scatter/style'

// Types
import { ScaleDimension } from '@/types/scale'
import { CrosshairCircle } from '@/components/crosshair/types'
import { CrosshairConfigInterface } from '@/components/crosshair/config'
import { CrosshairSnapMode } from '@/components/crosshair/constants'

const SVG_NS = 'http://www.w3.org/2000/svg'

type Datum = { x: number; y: number }
type TooltipInternals = { _setUpEvents: () => void }
type CrosshairSetup = { svg: SVGSVGElement; crosshair: Crosshair<Datum>; onCrosshairMove: ReturnType<typeof vi.fn> }

function pointerEvent (type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, isPrimary: true, ...init })
}

function setUpCrosshair (): CrosshairSetup {
  const svg = document.createElementNS(SVG_NS, 'svg')
  document.body.appendChild(svg)
  // Crosshair is shown only when its container is visible in the viewport
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 500, height: 300, right: 500, bottom: 300 } as DOMRect)

  const onCrosshairMove = vi.fn()
  const crosshair = new Crosshair<Datum>({ x: d => d.x, y: d => d.y, duration: 0, onCrosshairMove })
  svg.appendChild(crosshair.element)
  crosshair.setContainer(select(svg))
  crosshair.setData([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])
  crosshair.setSize(500, 300, 500, 300)
  crosshair.setScaleDomain(ScaleDimension.X, [0, 10])
  crosshair.setScaleRange(ScaleDimension.X, [0, 500])
  crosshair.setScaleDomain(ScaleDimension.Y, [0, 10])
  crosshair.setScaleRange(ScaleDimension.Y, [300, 0])

  return { svg, crosshair, onCrosshairMove }
}

const isShown = (crosshair: Crosshair<Datum>): boolean => crosshair.g.style('opacity') === '1'

describe('Crosshair pointer events (jsdom)', () => {
  beforeEach(() => {
    // Also fakes `requestAnimationFrame`
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('mouse', () => {
    it('shows on pointermove and reports the nearest datum', () => {
      const { svg, crosshair, onCrosshairMove } = setUpCrosshair()

      const e = pointerEvent('pointermove', { pointerType: 'mouse', clientX: 240, clientY: 150 })
      svg.dispatchEvent(e)
      vi.advanceTimersToNextFrame()

      expect(isShown(crosshair)).toBe(true)
      expect(crosshair.line.attr('x1')).toBe('250')
      expect(onCrosshairMove).toHaveBeenLastCalledWith(expect.closeTo(4.8), { x: 5, y: 5 }, 1, e, undefined)
    })

    it('hides on pointerout only when the pointer leaves the container', () => {
      const { svg, crosshair, onCrosshairMove } = setUpCrosshair()
      svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()

      svg.dispatchEvent(pointerEvent('pointerout', { pointerType: 'mouse', relatedTarget: crosshair.element }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(true)

      const e = pointerEvent('pointerout', { pointerType: 'mouse', relatedTarget: document.body })
      svg.dispatchEvent(e)
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)
      expect(onCrosshairMove).toHaveBeenLastCalledWith(undefined, undefined, undefined, e)
    })

    it('ignores pointerdown and pointerup', () => {
      const { svg, crosshair } = setUpCrosshair()

      svg.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)

      svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      svg.dispatchEvent(pointerEvent('pointerup', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(true)
    })
  })

  describe('touch', () => {
    it('shows on pointerdown, follows pointermove and hides on pointerup', () => {
      const { svg, crosshair, onCrosshairMove } = setUpCrosshair()
      const documentListener = vi.fn()
      document.addEventListener('pointerdown', documentListener)

      // Doesn't prevent the default action (scrolling, clicks) or stop the propagation
      const pointerDown = pointerEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 150 })
      svg.dispatchEvent(pointerDown)
      expect(pointerDown.defaultPrevented).toBe(false)
      expect(documentListener).toHaveBeenCalledTimes(1)
      document.removeEventListener('pointerdown', documentListener)

      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(true)
      expect(crosshair.line.attr('x1')).toBe('250')

      svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'touch', clientX: 480, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(crosshair.line.attr('x1')).toBe('500')

      const e = pointerEvent('pointerup', { pointerType: 'touch', clientX: 480, clientY: 150 })
      svg.dispatchEvent(e)
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)
      expect(onCrosshairMove).toHaveBeenLastCalledWith(undefined, undefined, undefined, e)
    })

    it('ignores all the fingers except the first one', () => {
      const { svg, crosshair } = setUpCrosshair()

      svg.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 150 }))
      svg.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 480, clientY: 150 }))
      svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 480, clientY: 150 }))
      svg.dispatchEvent(pointerEvent('pointerup', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 480, clientY: 150 }))
      svg.dispatchEvent(pointerEvent('pointerout', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 480, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(true)
      expect(crosshair.line.attr('x1')).toBe('250')
    })

    it('hides on pointerout without `relatedTarget` (Safari) only when the finger is outside of the container', () => {
      const { svg, crosshair } = setUpCrosshair()
      const elementFromPoint = vi.fn()
      Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: elementFromPoint })

      svg.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 150 }))
      elementFromPoint.mockReturnValue(crosshair.element)
      svg.dispatchEvent(pointerEvent('pointerout', { pointerType: 'touch', clientX: 260, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(elementFromPoint).toHaveBeenLastCalledWith(260, 150)
      expect(isShown(crosshair)).toBe(true)

      elementFromPoint.mockReturnValue(document.body)
      svg.dispatchEvent(pointerEvent('pointerout', { pointerType: 'touch', clientX: 900, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)

      delete (document as Partial<Document>).elementFromPoint
    })

    it('hides on pointercancel', () => {
      const { svg, crosshair } = setUpCrosshair()

      svg.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      // Browsers fire `pointercancel` with zero coordinates when they take over the gesture to scroll the page
      svg.dispatchEvent(pointerEvent('pointercancel', { pointerType: 'touch', clientX: 0, clientY: 0 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)
    })
  })

  describe('with XYContainer', () => {
    it('lets the finger drag the Crosshair by setting `touch-action` on the container, unless `followTouchMove` is `false`', () => {
      const element = document.createElement('div')
      document.body.appendChild(element)
      const crosshair = new Crosshair<Datum>({ x: d => d.x, y: d => d.y })
      const container = new XYContainer<Datum>(element, { crosshair, components: [] }, [{ x: 0, y: 0 }, { x: 1, y: 1 }])
      const svg = container.svg.node() as SVGSVGElement
      container.render(0)
      vi.advanceTimersToNextFrame()
      expect(svg.style.touchAction).toBe('pinch-zoom')

      crosshair.setConfig({ ...crosshair.config, followTouchMove: false })
      container.render(0)
      vi.advanceTimersToNextFrame()
      expect(svg.style.touchAction).toBe('')

      container.updateContainer({ crosshair: new Crosshair<Datum>({ x: d => d.x, y: d => d.y }), components: [] })
      container.render(0)
      vi.advanceTimersToNextFrame()
      expect(svg.style.touchAction).toBe('pinch-zoom')

      container.updateContainer({ crosshair: undefined, components: [] })
      container.render(0)
      vi.advanceTimersToNextFrame()
      expect(svg.style.touchAction).toBe('')
      container.destroy()
    })
  })

  describe('with Tooltip', () => {
    it('ignores the events that have reached one of the Tooltip triggers', () => {
      const { svg, crosshair, onCrosshairMove } = setUpCrosshair()
      const g = document.createElementNS(SVG_NS, 'g')
      const background = document.createElementNS(SVG_NS, 'rect')
      g.appendChild(background)
      svg.appendChild(g)
      select(g).append('path').datum('A').attr('class', 'segment')

      const container = document.createElement('div')
      document.body.appendChild(container)
      const tooltip = new Tooltip({ container, triggers: { segment: (d: string) => `Segment ${d}` } })
      tooltip.setComponents([{ element: g } as unknown as ComponentCore<unknown>])
      ;(tooltip as unknown as TooltipInternals)._setUpEvents()
      crosshair.tooltip = tooltip

      g.querySelector('path').dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 150 }))
      g.querySelector('path').dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(false)
      expect(onCrosshairMove).not.toHaveBeenCalled()

      background.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: 240, clientY: 150 }))
      vi.advanceTimersToNextFrame()
      expect(isShown(crosshair)).toBe(true)
    })
  })
})

type StackedDatum = { x: number; a: number; b: number; c: number }
type CrosshairInternals = { getCircleData: (datum: StackedDatum, datumIndex: number, seriesIndex?: number) => CrosshairCircle[] }

const datum: StackedDatum = { x: 5, a: 10, b: 20, c: 70 }
const datumIndex = 5
const colors = ['#3b82f6', '#f59e0b', '#10b981']

function getCircles (config: CrosshairConfigInterface<StackedDatum>, colorKeys?: string[]): CrosshairCircle[] {
  const crosshair = new Crosshair<StackedDatum>({
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
    const crosshair = new Crosshair<StackedDatum>({})
    crosshair.accessors = { x: d => d.x, y: [d => d.c], yStacked: [d => d.a, d => d.b], baseline: undefined }
    crosshair.pointOffset = (index, circleIndex) => (circleIndex === 2 ? { circle: [index, -index], lines: [0, 0] } : undefined)

    const circles = (crosshair as unknown as CrosshairInternals).getCircleData(datum, datumIndex)
    expect(circles.map(c => c.offset)).toEqual([undefined, undefined, [5, -5]])
  })

  it('keeps only the circle of the series under the pointer', () => {
    const crosshair = new Crosshair<StackedDatum>({ x: d => d.x, yStacked: [d => d.a, d => d.b], y: [d => d.c], color: (d, i) => colors[i] })
    const circles = (crosshair as unknown as CrosshairInternals).getCircleData(datum, datumIndex, 1)
    expect(circles.map(c => c.color)).toEqual([colors[1]])
  })

  it('ignores the offsets of the points when the accessors are configured on the Crosshair', () => {
    const circles = getCircles({})
    expect(circles.every(c => c.offset === undefined)).toBe(true)
  })
})

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
  svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: y }))
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
    svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: bar.x, clientY: bar.top }))
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
    svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: bar.x, clientY: nearBase }))
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
    svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: short.x, clientY: tall.top }))
    vi.advanceTimersToNextFrame()

    expect(isShown(crosshair)).toBe(true)
    expect(onCrosshairMove.mock.lastCall[4]).toBe(2)
    expect(getCircles(crosshair)[0][1]).toBeCloseTo(short.top)
  })

  it('puts every circle of the group on its bar when snapping along X, keeping the line in the middle of the group', () => {
    const { svg, bars, crosshair, rendered } = renderGroupedBars(CrosshairSnapMode.X)
    const group = rendered.filter(b => b.index === 0)
    svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: group[2].x, clientY: group[2].top }))
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
    svg.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: y }))
    vi.advanceTimersToNextFrame()
    return [onCrosshairMove.mock.lastCall[2], onCrosshairMove.mock.lastCall[4]]
  }

  it('picks the whole column under the pointer, far from the top of the stack too', () => {
    const { svg, bars, crosshair, onCrosshairMove } = renderStackedBars()
    const nearBase = bars.yScale(5)
    expect(nearBase - bars.yScale(140)).toBeGreaterThan(crosshair.config.hideWhenFarFromPointerDistance)
    expect(pointAt(svg, onCrosshairMove, bars.xScale(2), nearBase)).toEqual([1, undefined])
    expect(isShown(crosshair as unknown as Crosshair<Datum>)).toBe(true)
    expect(crosshair.g.selectAll('circle').size()).toBe(3)
  })

  it('picks the column the pointer is in, even right next to the top of a taller one', () => {
    const { svg, bars, onCrosshairMove } = renderStackedBars()
    expect(pointAt(svg, onCrosshairMove, bars.xScale(1), bars.yScale(140))).toEqual([0, undefined])
  })
})
