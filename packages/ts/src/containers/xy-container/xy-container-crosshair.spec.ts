import { afterEach, describe, expect, it, vi } from 'vitest'
import { XYContainer } from '@/containers/xy-container'
import { XYContainerConfigInterface } from '@/containers/xy-container/config'
import { Area } from '@/components/area'
import { Line } from '@/components/line'
import { StackedBar } from '@/components/stacked-bar'
import { Crosshair } from '@/components/crosshair'
import { CrosshairCircle } from '@/components/crosshair/types'
import { CrosshairSnapMode } from '@/components/crosshair/constants'
import { Scale } from '@/types/scale'

type Datum = { x: number; a: number; b: number }
type XYContainerInternals = { _render: (duration?: number) => void; _preRender: () => void; destroy: () => void }
type CrosshairInternals = {
  _xPx: number;
  _yPx: number;
  _mouseEvent: MouseEvent;
  _render: (duration?: number) => void;
  _onMouseMove: (event: MouseEvent) => void;
  _isContainerInViewport: () => boolean;
  getCircleData: (datum: Datum, datumIndex: number) => CrosshairCircle[];
}
type Hover = { index: number | undefined; visible: boolean; tooltipDatum: Datum | undefined }

const data: Datum[] = Array.from({ length: 10 }, (_, i) => ({ x: i, a: i === 4 ? 2 : 1, b: i === 5 ? 90 : 50 }))

const containers: XYContainerInternals[] = []
afterEach(() => {
  containers.splice(0).forEach(c => c.destroy())
  vi.restoreAllMocks()
})

function setup (config: XYContainerConfigInterface<Datum>): void {
  const container = new XYContainer<Datum>(document.createElement('div'), { width: 500, height: 400, ...config }, data) as unknown as XYContainerInternals
  containers.push(container)
  container._preRender()
  container._render(0)
}

/** Renders the crosshair with the pointer at the given position (relative to the chart) */
function hover (crosshair: Crosshair<Datum>, x: number, y: number): Hover {
  const internals = crosshair as unknown as CrosshairInternals
  const onCrosshairMove = vi.fn()
  crosshair.config.onCrosshairMove = onCrosshairMove
  vi.spyOn(internals, '_isContainerInViewport').mockReturnValue(true)
  const showTooltip = vi.spyOn(crosshair, '_showTooltip').mockImplementation(() => undefined)
  showTooltip.mockClear()

  internals._xPx = x
  internals._yPx = y
  internals._mouseEvent = new MouseEvent('mousemove')
  internals._render(0)
  return { index: onCrosshairMove.mock.calls[0]?.[2], visible: crosshair.g.style('opacity') === '1', tooltipDatum: showTooltip.mock.lastCall?.[0] }
}

const getCirclesY = (crosshair: Crosshair<Datum>, i: number): number[] => (crosshair as unknown as CrosshairInternals).getCircleData(data[i], i).map(c => c.y)

describe('XYContainer crosshair X scale', () => {
  it('takes the x accessor and the circles only from the components bound to its X scale', () => {
    const previous = new Line<Datum>({ x: d => d.x - 100, y: d => d.b, xScaleKey: 'previous' })
    const current = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const crosshair = new Crosshair<Datum>({ duration: 0 })
    setup({ components: [previous, current], crosshair })

    expect(crosshair.accessors.x).toBe(current.config.x)
    expect(crosshair.accessors.y).toEqual([current.config.y])
    expect(hover(crosshair, current.xScale(5), 100).index).toBe(5)
  })

  it('follows the named X scale set on the crosshair', () => {
    const line = new Line<Datum>({ x: d => d.x * 100, y: d => d.a, xScaleKey: 'time' })
    const crosshair = new Crosshair<Datum>({ duration: 0, xScaleKey: 'time' })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.b }), line], crosshair })

    expect(crosshair.accessors.x).toBe(line.config.x)
    expect(hover(crosshair, line.xScale(500), 100).index).toBe(5)
  })

  it('keeps the line and the tooltip working when every component is excluded', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0, template: d => `${d.x}` })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.a, excludeFromCrosshair: true })], crosshair })
    const warn = vi.spyOn(console, 'warn')

    ;(crosshair as unknown as CrosshairInternals)._onMouseMove(new MouseEvent('mousemove'))
    const { index, visible, tooltipDatum } = hover(crosshair, crosshair.xScale(5) + 3, 100)
    expect(warn).not.toHaveBeenCalled()
    expect(crosshair.accessors.y).toEqual([])
    expect([index, visible, tooltipDatum]).toEqual([5, true, data[5]])
    expect(crosshair.line.attr('x1')).toBe(`${Math.round(crosshair.xScale(5))}`)
  })

  it('snaps in X when snapping in both X and Y with every component excluded', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0, snapMode: CrosshairSnapMode.XY, template: d => `${d.x}` })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.a, excludeFromCrosshair: true })], crosshair })

    const { index, visible, tooltipDatum } = hover(crosshair, crosshair.xScale(5) + 3, 100)
    expect([index, visible, tooltipDatum]).toEqual([5, true, data[5]])
    expect(crosshair.line.attr('x1')).toBe(`${Math.round(crosshair.xScale(5))}`)
  })

  it('follows the X scale of the first component when none is bound to the primary one', () => {
    const line = new Line<Datum>({ x: d => d.x * 100, y: d => d.a, xScaleKey: 'time' })
    const crosshair = new Crosshair<Datum>({ duration: 0, template: d => `${d.x}` })
    setup({ components: [line], crosshair })
    const warn = vi.spyOn(console, 'warn')

    ;(crosshair as unknown as CrosshairInternals)._onMouseMove(new MouseEvent('mousemove'))
    const { index, visible, tooltipDatum } = hover(crosshair, line.xScale(500) + 3, 100)
    expect(warn).not.toHaveBeenCalled()
    expect(crosshair.accessors.x).toBe(line.config.x)
    expect(crosshair.xScale.domain()).toEqual([0, 900])
    expect([index, visible, tooltipDatum]).toEqual([5, true, data[5]])
    expect(crosshair.line.attr('x1')).toBe(`${Math.round(line.xScale(500))}`)
    expect(getCirclesY(crosshair, 5)).toEqual([line.yScale(1)])
  })

  it('follows the X scale of the first component not excluded from it, or of the first one when they all are', () => {
    const getLines = (excludeCurrent: boolean): Line<Datum>[] => [
      new Line<Datum>({ x: d => d.x - 100, y: d => d.b, xScaleKey: 'previous', excludeFromCrosshair: true }),
      new Line<Datum>({ x: d => d.x * 100, y: d => d.a, xScaleKey: 'time', excludeFromCrosshair: excludeCurrent }),
    ]

    const lines = getLines(false)
    const crosshair = new Crosshair<Datum>({ duration: 0 })
    setup({ components: lines, crosshair })
    expect([crosshair.accessors.x, crosshair.accessors.y]).toEqual([lines[1].config.x, [lines[1].config.y]])
    expect(hover(crosshair, lines[1].xScale(500), 100).index).toBe(5)

    const excludedLines = getLines(true)
    const excludedCrosshair = new Crosshair<Datum>({ duration: 0 })
    setup({ components: excludedLines, crosshair: excludedCrosshair })
    expect([excludedCrosshair.accessors.x, excludedCrosshair.accessors.y]).toEqual([excludedLines[0].config.x, []])
    expect(hover(excludedCrosshair, excludedLines[0].xScale(-95), 100).index).toBe(5)
  })
})

describe('XYContainer crosshair Y scales', () => {
  it('stays visible over the whole chart when its Y scale is mapped onto a segment', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0, template: d => `${d.b}` })
    const volume = new StackedBar<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'volume', excludeFromCrosshair: true })
    setup({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a }), volume],
      crosshair,
      yRangeSegment: [0.25, 1],
      yScales: { volume: { rangeSegment: [0, 0.18], domain: [0, undefined] } },
    })

    const [volumeBottom, volumeTop] = volume.yScale.range()
    const overVolume = hover(crosshair, crosshair.xScale(5), (volumeBottom + volumeTop) / 2)
    expect([overVolume.visible, overVolume.tooltipDatum]).toEqual([true, data[5]])
    expect(hover(crosshair, crosshair.xScale(5), 410).visible).toBe(false)
  })

  it('is visible only within the range of its Y scale without segments', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0 })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.a })], crosshair })

    const [bottom, top] = crosshair.yScale.range()
    expect(hover(crosshair, crosshair.xScale(5), top - 0.5).visible).toBe(false)
    expect(hover(crosshair, crosshair.xScale(5), top + 0.5).visible).toBe(true)
    expect(hover(crosshair, crosshair.xScale(5), bottom + 0.5).visible).toBe(false)
  })

  it('measures the distances to every series on its own Y scale when snapping in both X and Y', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0, snapMode: CrosshairSnapMode.XY })
    const lineA = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const lineB = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'vol' })
    setup({ components: [lineA, lineB], crosshair })

    expect(hover(crosshair, lineB.xScale(5), lineB.yScale(90)).index).toBe(5)
    expect(hover(crosshair, lineA.xScale(4), lineA.yScale(2)).index).toBe(4)
  })

  it('stacks the values only among the components bound to the same Y scale', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0, snapMode: CrosshairSnapMode.XY })
    const volume = new StackedBar<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'volume' })
    const price = new Area<Datum>({ x: d => d.x, y: [d => d.a], baseline: () => 10 })
    const volumeTop = new StackedBar<Datum>({ x: d => d.x, y: () => 5, yScaleKey: 'volume' })
    setup({ components: [volume, price, volumeTop], crosshair, yScales: { volume: { domain: [0, 200] } } })

    // Stacked circles in the order of the components, each stack with its own baseline
    expect(getCirclesY(crosshair, 5)).toEqual([volume.yScale(90), price.yScale(1 + 10), volume.yScale(95)])
    expect(hover(crosshair, volume.xScale(5), volume.yScale(95)).index).toBe(5)
  })

  it('stacks the values of all the components when they share the Y scale', () => {
    const crosshair = new Crosshair<Datum>({ duration: 0 })
    setup({
      components: [new Area<Datum>({ x: d => d.x, y: [d => d.a], baseline: () => 10 }), new StackedBar<Datum>({ x: d => d.x, y: d => d.b })],
      crosshair,
    })

    expect(getCirclesY(crosshair, 5)).toEqual([crosshair.yScale(1 + 10), crosshair.yScale(1 + 90 + 10)])
  })

  it('places the circles of the components bound to its Y scale on its own instance of the scale', () => {
    const componentYScale = Scale.scaleLinear().domain([0, 1000]).range([400, 0])
    const crosshair = new Crosshair<Datum>({ duration: 0, snapMode: CrosshairSnapMode.XY, hideWhenFarFromPointerDistance: 10 })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.a }), new Line<Datum>({ x: d => d.x, y: d => d.b, yScale: componentYScale })], crosshair })

    expect(getCirclesY(crosshair, 5)).toEqual([crosshair.yScale(1), crosshair.yScale(90)])
    expect(hover(crosshair, crosshair.xScale(3), crosshair.yScale(50)).visible).toBe(true)
  })

  it('places the circles on the Y scale configured on the crosshair', () => {
    const yScale = Scale.scaleLinear().domain([0, 10]).range([400, 0])
    const crosshair = new Crosshair<Datum>({ duration: 0, yScale })
    setup({ components: [new Line<Datum>({ x: d => d.x, y: d => d.a })], crosshair })

    expect(getCirclesY(crosshair, 5)).toEqual([yScale(1)])
  })
})

describe('XYContainer crosshair accessor reads', () => {
  /** Counts the reads of the components' accessors while rendering the crosshair with the pointer over a datum */
  function countReads (snapMode: CrosshairSnapMode, areaYScaleKey?: string): Record<string, number> {
    const reads = { x: 0, line: 0, area: 0, baseline: 0 }
    const count = (key: keyof typeof reads, value: (d: Datum) => number) => (d: Datum): number => { reads[key] += 1; return value(d) }
    const line = new Line<Datum>({ x: count('x', d => d.x), y: count('line', d => d.a) })
    const area = new Area<Datum>({ x: d => d.x, y: [count('area', d => d.b)], baseline: count('baseline', () => 0), yScaleKey: areaYScaleKey })
    const crosshair = new Crosshair<Datum>({ duration: 0, snapMode })
    setup({ components: [line, area], crosshair })

    for (const key of Object.keys(reads) as (keyof typeof reads)[]) reads[key] = 0
    hover(crosshair, line.xScale(5), line.yScale(1))
    return reads
  }

  // Snapping in X and Y reads the regular accessors once per datum and the stacked ones twice (the stacking and the missing
  // value check), then the circles read the stacked ones three times (the stacking, the opacity and the magnitude).
  // Keeping these counts keeps the circles of impure accessors (e.g. random values) where they've always been
  it('reads the accessors as many times as getNearest2D and the circles do when the components share the Y scale', () => {
    const n = data.length
    expect(countReads(CrosshairSnapMode.X)).toEqual({ x: 1, line: 1, area: 3, baseline: 1 })
    expect(countReads(CrosshairSnapMode.XY)).toEqual({ x: n + 1, line: n + 1, area: 2 * n + 3, baseline: n + 1 })
  })

  it('reads every accessor once per datum when the components are bound to different Y scales', () => {
    const n = data.length
    expect(countReads(CrosshairSnapMode.X, 'volume')).toEqual({ x: 1, line: 1, area: 1, baseline: 1 })
    expect(countReads(CrosshairSnapMode.XY, 'volume')).toEqual({ x: n + 1, line: n + 1, area: n + 1, baseline: n + 1 })
  })
})
