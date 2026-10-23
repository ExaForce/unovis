import { afterEach, describe, expect, it, vi } from 'vitest'
import { XYContainer } from '@/containers/xy-container'
import { XYContainerConfigInterface } from '@/containers/xy-container/config'
import { AXES_STACK_GAP_PX } from '@/containers/xy-container/constants'
import { Area } from '@/components/area'
import { Axis } from '@/components/axis'
import { AxisConfigInterface } from '@/components/axis/config'
import { Line } from '@/components/line'
import { Crosshair } from '@/components/crosshair'
import { Scale } from '@/types/scale'
import { Spacing } from '@/types/spacing'

type Datum = { x: number; a: number; b: number; c: number }
type XYContainerInternals = {
  _render: (duration?: number) => void;
  _preRender: () => void;
  _getMargin: () => Spacing;
  updateContainer: (config: XYContainerConfigInterface<Datum>, preventRender?: boolean) => void;
  width: number;
  height: number;
}
type AxisInternals = { _axisSizeBBox: Rect; _requiredMargin: Spacing; _getRequiredMargin: (bbox: Rect) => Spacing; _getFullDomainPath: (tickSize?: number) => string }
type Rect = { x: number; y: number; width: number; height: number }

// Creating a container schedules a render, which must not outlive the test: jsdom can't render the axes
const containers: XYContainer<Datum>[] = []
const createContainer = (config: XYContainerConfigInterface<Datum>, data: Datum[]): XYContainerInternals => {
  const container = new XYContainer<Datum>(document.createElement('div'), config, data)
  containers.push(container)
  return container as unknown as XYContainerInternals
}

afterEach(() => {
  for (const container of containers.splice(0)) container.destroy()
})

// jsdom can't measure SVG, so the axes report fixed sizes instead of rendering themselves
const mockAxis = (config: AxisConfigInterface<Datum>, margin: Spacing): Axis<Datum> => {
  const axis = new Axis<Datum>(config)
  vi.spyOn(axis, 'preRender').mockImplementation(() => undefined)
  vi.spyOn(axis, 'render').mockImplementation(() => undefined)
  vi.spyOn(axis, 'getRequiredMargin').mockReturnValue(margin)
  vi.spyOn(axis, 'getCrossExtent').mockReturnValue([0, margin[axis.getPosition() as keyof Spacing] ?? 0])
  return axis
}

// An axis measuring the given bounding box (relative to the axis line), which its margin and extent get derived from
const measuredAxis = (config: AxisConfigInterface<Datum>, bbox: Rect): Axis<Datum> => {
  const axis = new Axis<Datum>(config)
  const internals = axis as unknown as AxisInternals
  vi.spyOn(axis, 'preRender').mockImplementation(() => {
    internals._axisSizeBBox = bbox
    internals._requiredMargin = internals._getRequiredMargin(bbox)
  })
  vi.spyOn(axis, 'render').mockImplementation(() => undefined)
  return axis
}

const getOffset = (axis: Axis<Datum>): number => (axis as unknown as { _offset: number })._offset

describe('XYContainer', () => {
  it('passes the Crosshair one color key per circle, stacked first', () => {
    const data: Datum[] = [{ x: 0, a: 1, b: 2, c: 3 }, { x: 1, a: 2, b: 3, c: 4 }]
    const crosshair = new Crosshair<Datum>()
    const container = createContainer({
      components: [
        new Line<Datum>({ x: d => d.x, y: d => d.c, colorKeys: ['c'] }),
        new Area<Datum>({ x: d => d.x, y: [d => d.a, d => d.b] }),
        new Line<Datum>({ x: d => d.x, y: [d => d.a, d => d.b], colorKeys: ['d'] }),
      ],
      crosshair,
    }, data)

    container._render(0)
    expect(crosshair.colorKeys).toEqual([undefined, undefined, 'c', 'd', undefined])
  })
})

describe('XYContainer named scales', () => {
  const data: Datum[] = [{ x: 0, a: 1, b: 50, c: 3 }, { x: 1, a: 2, b: 90, c: 4 }]

  it('calculates a separate domain for the components bound to a named Y scale', () => {
    const primary = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const secondary = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'pct' })
    const container = createContainer({
      components: [primary, secondary],
    }, data)

    container._preRender()
    expect(primary.yScale.domain()).toEqual([1, 2])
    expect(secondary.yScale.domain()).toEqual([50, 90])
    expect(primary.xScale.domain()).toEqual([0, 1])
    expect(secondary.xScale.domain()).toEqual([0, 1])
  })

  it('applies the configured domain and scale instance of a named Y scale', () => {
    const pctScale = Scale.scaleLinear()
    const primary = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const secondary = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'pct' })
    const axis = new Axis<Datum>({ type: 'y', yScaleKey: 'pct' })
    const container = createContainer({
      components: [primary, secondary],
      yAxis: axis,
      yScales: { pct: { scale: pctScale, domain: [0, 100] } },
      autoMargin: false,
    }, data)

    container._preRender()
    expect(primary.yScale.domain()).toEqual([1, 2])
    expect(secondary.yScale).toBe(pctScale)
    expect(axis.yScale).toBe(pctScale)
    expect(pctScale.domain()).toEqual([0, 100])
  })

  it('passes the Crosshair the Y scale of each circle', () => {
    const crosshair = new Crosshair<Datum>()
    const primary = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const secondary = new Area<Datum>({ x: d => d.x, y: [d => d.b, d => d.c], yScaleKey: 'pct' })
    const container = createContainer({
      components: [primary, secondary],
      crosshair,
    }, data)

    container._render(0)
    // The circles of the components on the crosshair's own Y scale fall back to `crosshair.yScale`
    expect(crosshair.circleYScales).toEqual([secondary.yScale, secondary.yScale, undefined])
  })
})

describe('XYContainer stacked axes', () => {
  const data: Datum[] = [{ x: 0, a: 1, b: 50, c: 3 }, { x: 1, a: 2, b: 90, c: 4 }]

  it('stacks the axes sharing a side outwards and reserves margin for all of them', () => {
    const yInner = mockAxis({ type: 'y' }, { left: 40, top: 2, bottom: 2 })
    const yOuter = mockAxis({ type: 'y', yScaleKey: 'pct' }, { left: 30, top: 5, bottom: 0 })
    const yRight = mockAxis({ type: 'y', position: 'right' }, { right: 25, top: 0, bottom: 0 })
    const xBottom = mockAxis({ type: 'x' }, { bottom: 20, left: 0, right: 10 })
    const xBottomOuter = mockAxis({ type: 'x' }, { bottom: 15, left: 0, right: 0 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      xAxis: [xBottom, xBottomOuter],
      yAxis: [yInner, yOuter, yRight],
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    expect([yInner, yOuter, yRight, xBottom, xBottomOuter].map(getOffset)).toEqual([0, 40 + AXES_STACK_GAP_PX, 0, 0, 20 + AXES_STACK_GAP_PX])
    // Left: 40 + gap + 30, right: max(25, 10), top: max(2, 5), bottom: 20 + gap + 15
    expect(container.width).toBe(500 - (40 + AXES_STACK_GAP_PX + 30) - 25)
    expect(container.height).toBe(300 - 5 - (20 + AXES_STACK_GAP_PX + 15))
  })

  it('offsets the stacked axes even when the margins are set manually', () => {
    const yInner = mockAxis({ type: 'y' }, { left: 40, top: 0, bottom: 0 })
    const yOuter = mockAxis({ type: 'y' }, { left: 30, top: 0, bottom: 0 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      yAxis: [yInner, yOuter],
      autoMargin: false,
      margin: { left: 100 },
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    expect(getOffset(yOuter)).toBe(40 + AXES_STACK_GAP_PX)
    expect(container.width).toBe(400)
  })

  it('keeps a single axis per side at the chart edge', () => {
    const yAxis = mockAxis({ type: 'y' }, { left: 40, top: 0, bottom: 0 })
    const xAxis = mockAxis({ type: 'x' }, { bottom: 20, left: 0, right: 0 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      xAxis,
      yAxis,
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    expect([xAxis, yAxis].map(getOffset)).toEqual([0, 0])
    expect(container.width).toBe(460)
    expect(container.height).toBe(280)
  })

  describe('with the margins set manually', () => {
    const config: XYContainerConfigInterface<Datum> = {
      autoMargin: false,
      margin: { left: 100, right: 100 },
      width: 500,
      height: 300,
    }
    const createStackedContainer = (yAxis: Axis<Datum>[]): XYContainerInternals => {
      const container = createContainer({ ...config, components: [new Line<Datum>({ x: d => d.x, y: d => d.a })], yAxis }, data)
      container._preRender()
      expect(getOffset(yAxis[1])).toBe(40 + AXES_STACK_GAP_PX)
      return container
    }

    it('returns an axis to the chart edge once the other axis on its side is removed', () => {
      const yInner = mockAxis({ type: 'y' }, { left: 40, top: 0, bottom: 0 })
      const yOuter = mockAxis({ type: 'y' }, { left: 30, top: 0, bottom: 0 })
      const container = createStackedContainer([yInner, yOuter])

      container.updateContainer({ ...config, yAxis: [yOuter] }, true)
      container._preRender()
      expect(getOffset(yOuter)).toBe(0)
      expect(yOuter.getOffset(container._getMargin())).toEqual({ left: 100, top: 0 })
    })

    it('returns an axis to the chart edge once it moves to a side of its own', () => {
      const yInner = mockAxis({ type: 'y' }, { left: 40, top: 0, bottom: 0 })
      const yOuter = mockAxis({ type: 'y' }, { left: 30, top: 0, bottom: 0 })
      const container = createStackedContainer([yInner, yOuter])

      yOuter.setConfig({ ...yOuter.config, position: 'right' })
      container._preRender()
      expect(getOffset(yOuter)).toBe(0)
      expect(yOuter.getOffset(container._getMargin())).toEqual({ left: 100 + container.width, top: 0 })
    })
  })

  it('measures no axes when the margins are set manually and each side has a single axis', () => {
    const yAxis = mockAxis({ type: 'y' }, { left: 40, top: 0, bottom: 0 })
    const xAxis = mockAxis({ type: 'x' }, { bottom: 20, left: 0, right: 0 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      xAxis,
      yAxis,
      autoMargin: false,
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    expect(yAxis.preRender).not.toHaveBeenCalled()
    expect(xAxis.preRender).not.toHaveBeenCalled()
  })

  it('keeps even gaps between the stacked axes whose labels reach towards the chart', () => {
    // The middle axis has rotated tick labels reaching 15px above its line
    const bboxes: Rect[] = [
      { x: 0, y: 0, width: 400, height: 50 },
      { x: 0, y: -15, width: 400, height: 65 },
      { x: 0, y: 0, width: 400, height: 20 },
    ]
    const xAxis = bboxes.map(bbox => measuredAxis({ type: 'x' }, bbox))
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      xAxis,
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    // Distances of the bounding box edges from the chart edge
    const [inner, rotated, outer] = xAxis.map((axis, i) => [getOffset(axis) + bboxes[i].y, getOffset(axis) + bboxes[i].y + bboxes[i].height])
    expect(rotated[0] - inner[1]).toBe(AXES_STACK_GAP_PX)
    expect(outer[0] - rotated[1]).toBe(AXES_STACK_GAP_PX)
    expect(container.height).toBe(300 - outer[1])
  })

  it('reserves the margin a single axis per side requires on its own', () => {
    // Tick labels reaching towards the chart don't reduce the margin of an axis that isn't stacked
    const xAxis = measuredAxis({ type: 'x' }, { x: 0, y: -15, width: 400, height: 65 })
    const yAxis = measuredAxis({ type: 'y', position: 'right' }, { x: -10, y: 0, width: 50, height: 100 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      xAxis,
      yAxis,
      width: 500,
      height: 300,
    }, data)

    container._preRender()
    expect(container._getMargin()).toEqual({ top: 0, bottom: 65, left: 0, right: 50 })
  })
})

describe('XYContainer range segments', () => {
  const data: Datum[] = [{ x: 0, a: 1, b: 50, c: 3 }, { x: 1, a: 2, b: 90, c: 4 }]

  it('maps the scales onto their segments of the chart', () => {
    const reference = new Line<Datum>({ x: d => d.x, y: d => d.c, xScaleKey: 'full', yScaleKey: 'full' })
    const price = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const volume = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'volume' })
    const container = createContainer({
      components: [reference, price, volume],
      xRangeSegment: [0.5, 1],
      yRangeSegment: [0.25, 1],
      yScales: { volume: { rangeSegment: [0, 0.2] } },
      width: 500,
      height: 400,
    }, data)

    container._preRender()
    const [x0, x1] = reference.xScale.range()
    const [y0, y1] = reference.yScale.range()
    expect(y0).toBeGreaterThan(y1)
    // Both components share the primary X scale, mapped onto the right half of the chart
    expect(price.xScale.range()).toEqual([x0 + (x1 - x0) * 0.5, x1])
    expect(volume.xScale.range()).toEqual(price.xScale.range())
    expect(price.yScale.range()).toEqual([y0 + (y1 - y0) * 0.25, y1])
    expect(volume.yScale.range()).toEqual([y0, y0 + (y1 - y0) * 0.2])
  })

  it('passes the axes the segments of their scales', () => {
    // The axes take different sides, so they don't get measured (jsdom can't) for stacking
    const priceAxis = new Axis<Datum>({ type: 'y', position: 'right' })
    const volumeAxis = new Axis<Datum>({ type: 'y', yScaleKey: 'volume' })
    const xAxis = new Axis<Datum>({ type: 'x' })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      yAxis: [priceAxis, volumeAxis],
      xAxis,
      yRangeSegment: [0.25, 1],
      yScales: { volume: { rangeSegment: [0, 0.2] } },
      autoMargin: false,
      width: 500,
      height: 400,
    }, data)

    container._preRender()
    const getSegment = (axis: Axis<Datum>): [number, number] => (axis as unknown as { _rangeSegment: [number, number] })._rangeSegment
    expect(getSegment(priceAxis)).toEqual([0.25, 1])
    expect(getSegment(volumeAxis)).toEqual([0, 0.2])
    expect(getSegment(xAxis)).toEqual([0, 1])
  })

  it('draws the domain line of a segmented axis along the padded range of its scale', () => {
    const priceAxis = new Axis<Datum>({ type: 'y', position: 'right' })
    const volumeAxis = new Axis<Datum>({ type: 'y', yScaleKey: 'volume' })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a }), new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'volume' })],
      yAxis: [priceAxis, volumeAxis],
      yScales: { volume: { rangeSegment: [0, 0.2], domain: [0, 100] } },
      padding: { top: 20, bottom: 20 },
      autoMargin: false,
      width: 500,
      height: 400,
    }, data)

    container._preRender()
    const getDomainPath = (axis: Axis<Datum>): string => (axis as unknown as AxisInternals)._getFullDomainPath(0)
    const [bottom, top] = volumeAxis.yScale.range()
    expect(bottom).toBeLessThanOrEqual(380)
    expect(top).toBeGreaterThan(300)
    expect(getDomainPath(volumeAxis)).toBe(`M0, ${bottom + 0.5} H0.5 V${top + 0.5} H0`)
    // An axis spanning the whole chart keeps spanning it regardless of the padding
    expect(getDomainPath(priceAxis)).toBe('M0, 400.5 H0.5 V0.5 H0')
  })

  it('reserves margin for the tick labels of a segmented axis overflowing the chart edge', () => {
    // The top tick label of the axis on the upper three quarters of the chart reaches 6px above it
    const yAxis = measuredAxis({ type: 'y' }, { x: -35, y: -6, width: 35, height: 306.5 })
    const container = createContainer({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a })],
      yAxis,
      yRangeSegment: [0.25, 1],
      width: 500,
      height: 400,
    }, data)

    container._preRender()
    expect(container._getMargin()).toEqual({ top: 6, bottom: 0, left: 35, right: 0 })
  })

  it('leaves the components excluded from the crosshair without circles', () => {
    const crosshair = new Crosshair<Datum>()
    const shown = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const excluded = new Area<Datum>({ x: d => d.x, y: [d => d.b, d => d.c], excludeFromCrosshair: true })
    const container = createContainer({
      components: [excluded, shown],
      crosshair,
    }, data)

    container._render(0)
    expect(crosshair.accessors.y).toHaveLength(1)
    expect(crosshair.accessors.yStacked).toHaveLength(0)
    expect(crosshair.circleYScales).toEqual([undefined])
  })
})
