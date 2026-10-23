import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Selection } from 'd3-selection'

// Core
import { Axis } from '@/components/axis'
import { AxisConfigInterface } from '@/components/axis/config'
import { XYContainer } from '@/containers/xy-container'
import { AXES_STACK_GAP_PX } from '@/containers/xy-container/constants'

// Types
import { Position } from '@/types/position'
import { ScaleDimension } from '@/types/scale'
import { Spacing } from '@/types/spacing'

type Rect = { x: number; y: number; width: number; height: number }
type AxisInternals = {
  _axisRawBBox: Rect;
  _axisSizeBBox: Rect;
  _tickTextStyleCached: { fontSize: number; fontFamily: string };
  _getFullDomainPath: (tickSize?: number) => string;
  _getRequiredMargin: (axisSize: Rect) => Spacing;
  _requiredMargin: Spacing;
  _offset: number;
  _renderAxisLabel: () => void;
  axisGroup: Selection<SVGGElement, unknown, SVGGElement, unknown>;
  gridGroup: Selection<SVGGElement, unknown, SVGGElement, unknown>;
}

const createAxis = (type: 'x' | 'y', segment?: [number, number], range?: [number, number], label?: string): Axis<unknown> => {
  const axis = new Axis<unknown>({ type, label })
  axis.setSize(100, 200, 100, 200)
  axis.setScaleRange(ScaleDimension.X, type === 'x' && range ? range : [0, 100])
  axis.setScaleRange(ScaleDimension.Y, type === 'y' && range ? range : [200, 0])
  axis.setRangeSegment(segment)
  return axis
}

describe('Axis range segment', () => {
  const getDomainPath = (type: 'x' | 'y', segment?: [number, number], range?: [number, number]): string => {
    return (createAxis(type, segment, range) as unknown as AxisInternals)._getFullDomainPath(0)
  }

  it('spans the whole chart by default', () => {
    expect(getDomainPath('x')).toBe('M0.5, 0 V0.5 H100.5 V0')
    expect(getDomainPath('y')).toBe('M0, 200.5 H0.5 V0.5 H0')
    // Regardless of the padding
    expect(getDomainPath('x', undefined, [10, 90])).toBe('M0.5, 0 V0.5 H100.5 V0')
    expect(getDomainPath('y', undefined, [190, 10])).toBe('M0, 200.5 H0.5 V0.5 H0')
  })

  it('spans only the range of its scale on a segment of the chart', () => {
    expect(getDomainPath('x', [0.5, 1], [50, 100])).toBe('M50.5, 0 V0.5 H100.5 V0')
    // The Y range runs bottom to top, so the bottom fifth of the chart is the segment [0, 0.2]
    expect(getDomainPath('y', [0, 0.2], [200, 160])).toBe('M0, 200.5 H0.5 V160.5 H0')
    expect(getDomainPath('y', [0.25, 1], [150, 0])).toBe('M0, 150.5 H0.5 V0.5 H0')
  })

  it('follows the padded range of its scale on a segment of the chart', () => {
    // Segments of the ranges [10, 90] and [190, 10], padded by 10px on each side
    expect(getDomainPath('x', [0.5, 1], [50, 90])).toBe('M50.5, 0 V0.5 H90.5 V0')
    expect(getDomainPath('y', [0, 0.2], [190, 154])).toBe('M0, 190.5 H0.5 V154.5 H0')
    // The Y range runs top to bottom with `yDirection: 'south'`
    expect(getDomainPath('y', [0, 0.2], [10, 46])).toBe('M0, 46.5 H0.5 V10.5 H0')
  })
})

describe('Axis required margin', () => {
  const getRequiredMargin = (segment: [number, number] | undefined, bbox: Rect, position?: 'left' | 'right'): Spacing => {
    const axis = new Axis<unknown>({ type: 'y', position })
    axis.setSize(100, 400, 100, 400)
    axis.setRangeSegment(segment)
    return (axis as unknown as AxisInternals)._getRequiredMargin(bbox)
  }

  it('splits the overflow of a Y axis spanning the whole chart between the chart edges', () => {
    expect(getRequiredMargin(undefined, { x: -35, y: -6, width: 35, height: 412 })).toEqual({ left: 35, top: 6, bottom: 6 })
    expect(getRequiredMargin(undefined, { x: -35, y: -6, width: 35, height: 306.5 })).toEqual({ left: 35, top: 0, bottom: 0 })
  })

  it('requests margin for the tick labels of a segmented Y axis overflowing the chart edge', () => {
    // The top tick label of the axis on the upper three quarters of the chart reaches 6px above it
    expect(getRequiredMargin([0.25, 1], { x: -35, y: -6, width: 35, height: 306.5 })).toEqual({ left: 35, top: 6, bottom: 0 })
    // The bottom tick label of the axis on the lower fifth of the chart reaches 6px below it
    expect(getRequiredMargin([0, 0.2], { x: 0, y: 314, width: 30, height: 92 }, 'right')).toEqual({ right: 30, top: 0, bottom: 6 })
  })
})

describe('Axis position', () => {
  it('returns the configured position, or the default one for the axis type', () => {
    const getPosition = (type: 'x' | 'y', position?: `${Position}`): Position => new Axis<unknown>({ type, position }).getPosition()
    expect(getPosition('x')).toBe(Position.Bottom)
    expect(getPosition('x', 'top')).toBe(Position.Top)
    expect(getPosition('y')).toBe(Position.Left)
    expect(getPosition('y', 'right')).toBe(Position.Right)
    // Also a position that doesn't apply to the axis type, as the tick labels and the label get placed by it
    expect(getPosition('x', 'left')).toBe(Position.Left)
    expect(getPosition('y', 'center')).toBe(Position.Center)
  })
})

describe('Axis offset', () => {
  it('shifts the axis away from the chart by its offset', () => {
    const getOffset = (type: 'x' | 'y', position: `${Position}`): { left: number; top: number } => {
      const axis = new Axis<unknown>({ type, position })
      axis.setSize(200, 100, 300, 160)
      axis.setOffset(10)
      return axis.getOffset({ top: 20, bottom: 40, left: 50, right: 50 })
    }
    expect(getOffset('x', 'bottom')).toEqual({ top: 130, left: 50 })
    expect(getOffset('x', 'top')).toEqual({ top: 10, left: 50 })
    expect(getOffset('y', 'left')).toEqual({ top: 20, left: 40 })
    expect(getOffset('y', 'right')).toEqual({ top: 20, left: 260 })
    // An axis whose position doesn't apply to its type sits on the default side
    expect(getOffset('x', 'left')).toEqual({ top: 130, left: 50 })
    expect(getOffset('y', 'center')).toEqual({ top: 20, left: 40 })
  })

  it('measures how far the axis reaches towards the chart and away from it', () => {
    const getCrossExtent = (type: 'x' | 'y', position: `${Position}`, bbox: Rect): [number, number] => {
      const axis = new Axis<unknown>({ type, position })
      ;(axis as unknown as AxisInternals)._axisSizeBBox = bbox
      return axis.getCrossExtent()
    }
    // Tick labels reaching 5px over the axis line towards the chart
    expect(getCrossExtent('x', 'bottom', { x: 0, y: -5, width: 100, height: 30 })).toEqual([5, 25])
    expect(getCrossExtent('x', 'top', { x: 0, y: -25, width: 100, height: 30 })).toEqual([5, 25])
    expect(getCrossExtent('y', 'left', { x: -25, y: 0, width: 30, height: 100 })).toEqual([5, 25])
    expect(getCrossExtent('y', 'right', { x: -5, y: 0, width: 30, height: 100 })).toEqual([5, 25])
    // An axis starting away from its line doesn't reach towards the chart
    expect(getCrossExtent('x', 'bottom', { x: 0, y: 2, width: 100, height: 30 })).toEqual([0, 32])
    // An axis whose position doesn't apply to its type sits on the default side
    expect(getCrossExtent('x', 'left', { x: 0, y: -5, width: 100, height: 30 })).toEqual([5, 25])
    expect(getCrossExtent('y', 'center', { x: -25, y: 0, width: 30, height: 100 })).toEqual([5, 25])
  })
})

describe('Axis rendering', () => {
  // jsdom doesn't lay out SVG, so text and boxes get fixed sizes
  const prototype = SVGElement.prototype as unknown as Record<string, unknown>
  beforeAll(() => {
    prototype.getBBox = (): Rect => ({ x: 0, y: 0, width: 40, height: 12 })
    prototype.getComputedTextLength = (): number => 40
  })
  afterAll(() => {
    delete prototype.getBBox
    delete prototype.getComputedTextLength
  })

  it('keeps the grid lines on the chart edge when the axis is offset from it', () => {
    const getGridTransform = (type: 'x' | 'y', position: `${Position}`, offset: number): string | null => {
      const axis = new Axis<unknown>({ type, position })
      const internals = axis as unknown as AxisInternals
      axis.setSize(100, 200, 100, 200)
      axis.setScaleRange(ScaleDimension.X, [0, 100])
      axis.setScaleRange(ScaleDimension.Y, [200, 0])
      internals._tickTextStyleCached = { fontSize: 12, fontFamily: 'sans-serif' }
      axis.setOffset(offset)
      axis._render(0)
      const transform = internals.gridGroup.attr('transform')
      axis.destroy()
      return transform
    }
    expect(getGridTransform('x', 'bottom', 10)).toBe('translate(0,-10)')
    expect(getGridTransform('x', 'top', 10)).toBe('translate(0,10)')
    expect(getGridTransform('y', 'left', 10)).toBe('translate(10,0)')
    expect(getGridTransform('y', 'right', 10)).toBe('translate(-10,0)')
    expect(getGridTransform('y', 'left', 0)).toBeNull()
    expect(getGridTransform('x', 'left', 10)).toBe('translate(0,-10)')
    expect(getGridTransform('y', 'center', 10)).toBe('translate(10,0)')
  })

  it('places the labels of an axis whose position does not apply to its type by that position', () => {
    const getLabelPlacement = (type: 'x' | 'y', position?: `${Position}`): { tickText: [number, number]; label: string } => {
      const axis = new Axis<unknown>({ type, position, label: 'Label' })
      const internals = axis as unknown as AxisInternals
      axis.setSize(100, 200, 100, 200)
      axis.setScaleRange(ScaleDimension.X, [0, 100])
      axis.setScaleRange(ScaleDimension.Y, [200, 0])
      internals._tickTextStyleCached = { fontSize: 12, fontFamily: 'sans-serif' }
      axis._render(0)
      // The outer tspan of a tick label sets its vertical offset, the inner one the horizontal offset
      const tickText = internals.axisGroup.select('g.tick text > tspan')
      const tickTextOffset: [number, number] = [Number(tickText.select('tspan').attr('x')), Number(tickText.attr('y'))]
      const label = internals.axisGroup.select(':scope > text').attr('transform')
      axis.destroy()
      return { tickText: tickTextOffset, label }
    }
    // The tick labels of an X axis go below it only at the bottom, and its label goes above it only at the top
    expect(getLabelPlacement('x')).toEqual({ tickText: [0, 20], label: 'translate(50,20) rotate(0)' })
    expect(getLabelPlacement('x', 'left')).toEqual({ tickText: [0, -20], label: 'translate(50,20) rotate(0)' })
    expect(getLabelPlacement('x', 'center')).toEqual({ tickText: [0, -20], label: 'translate(50,20) rotate(0)' })
    // The label of a Y axis goes to the left of it only on the left
    expect(getLabelPlacement('y')).toEqual({ tickText: [-14, -6], label: 'translate(-48,100) rotate(-90)' })
    expect(getLabelPlacement('y', 'center')).toEqual({ tickText: [-14, -6], label: 'translate(48,100) rotate(-90)' })
    expect(getLabelPlacement('y', 'top')).toEqual({ tickText: [-14, -6], label: 'translate(48,100) rotate(-90)' })
  })

  it('centers the label on the range of its scale on a segment of the chart', () => {
    const getLabelCenter = (segment?: [number, number], range?: [number, number]): number => {
      const internals = createAxis('y', segment, range, 'Volume') as unknown as AxisInternals
      internals._axisRawBBox = { x: -30, y: 0, width: 30, height: 200 }
      internals._renderAxisLabel()
      const transform = internals.axisGroup.select('text').attr('transform')
      return Number(/translate\([^,]+,([^)]+)\)/.exec(transform)?.[1])
    }
    expect(getLabelCenter(undefined, [190, 10])).toBe(100)
    expect(getLabelCenter([0, 0.2], [190, 154])).toBe(172)
  })
})

describe('Axis stacking', () => {
  // jsdom can't measure SVG, so the axes measure the given bounding boxes (relative to the axis line)
  const measuredAxis = (config: AxisConfigInterface<unknown>, bbox: Rect): Axis<unknown> => {
    const axis = new Axis<unknown>(config)
    const internals = axis as unknown as AxisInternals
    vi.spyOn(axis, 'preRender').mockImplementation(() => {
      internals._axisSizeBBox = bbox
      internals._requiredMargin = internals._getRequiredMargin(bbox)
    })
    vi.spyOn(axis, 'render').mockImplementation(() => undefined)
    return axis
  }

  it('stacks an axis whose position does not apply to its type on the side it sits on', () => {
    const xAxis = [{}, { position: 'left' } as const].map(config => measuredAxis(config, { x: 0, y: 0, width: 100, height: 20 }))
    const yAxis = [{}, { position: 'center' } as const].map(config => measuredAxis(config, { x: -40, y: 0, width: 40, height: 100 }))
    const container = new XYContainer<unknown>(document.createElement('div'), { xAxis, yAxis, width: 500, height: 300 })
    const containerInternals = container as unknown as { _preRender: () => void; _getMargin: () => Spacing }
    containerInternals._preRender()
    const offsets = [...xAxis, ...yAxis].map(axis => (axis as unknown as AxisInternals)._offset)
    const margin = containerInternals._getMargin()
    container.destroy()

    // The X axes stack at the bottom and the Y axes on the left
    expect(offsets).toEqual([0, 20 + AXES_STACK_GAP_PX, 0, 40 + AXES_STACK_GAP_PX])
    expect(margin).toEqual({ top: 0, bottom: 20 + AXES_STACK_GAP_PX + 20, left: 40 + AXES_STACK_GAP_PX + 40, right: 0 })
  })
})
