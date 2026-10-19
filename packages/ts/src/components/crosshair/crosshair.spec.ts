import { describe, expect, it } from 'vitest'

// Core
import { Crosshair } from '@/components/crosshair'

// Types
import { ScaleDimension } from '@/types/scale'
import { CrosshairCircle } from '@/components/crosshair/types'

type Datum = { x: number; a: number; b: number; c: number | undefined }
type CrosshairInternals = {
  getCircleData: (datum: Datum, datumIndex: number) => CrosshairCircle[];
  getPaintOrder: (circles: CrosshairCircle[]) => CrosshairCircle[];
}

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
