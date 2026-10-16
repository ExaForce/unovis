import { describe, expect, it } from 'vitest'

// Types
import { ScaleDimension } from '@/types/scale-dimension'

// Local
import { StackedBar } from './index'

type Datum = { x: number; a: number; b: number; c: number }

const WIDTH = 600
const HEIGHT = 300

/** Renders the bars the way the container does: sizes and scales first, then `bleed`, which prepares the bars */
function renderBars (data: Datum[]): StackedBar<Datum> {
  const bars = new StackedBar<Datum>({ x: d => d.x, y: [d => d.a, d => d.b, d => d.c], duration: 0 })
  bars.setData(data)
  bars.setSize(WIDTH, HEIGHT, WIDTH, HEIGHT)
  bars.setScaleDomain(ScaleDimension.X, [0, 3])
  bars.setScaleDomain(ScaleDimension.Y, [-50, 100])
  bars.setScaleRange(ScaleDimension.X, [0, WIDTH])
  bars.setScaleRange(ScaleDimension.Y, [HEIGHT, 0])
  expect(bars.bleed).toBeDefined()
  bars.render(0)
  return bars
}

describe('StackedBar point offsets', () => {
  // 2px per unit, so 0 is at 200px, and the top and the bottom of the plot are at 0 and 300px
  const data: Datum[] = [{ x: 1, a: 40, b: 25, c: 10 }, { x: 2, a: -20, b: 30, c: 0 }]
  const ends = [[40, 65, 75], [-20, 30, 30]]

  it('let every segment answer for its part of the column, and the outermost ones for the rest of it', () => {
    const bars = renderBars(data)
    const getHit = (i: number, j: number): number[] => {
      const { hit } = bars.getPointOffset(i, j)
      return hit.map(([, y]) => +(bars.yScale(ends[i][j]) + y).toFixed(6))
    }

    expect([0, 1, 2].map(j => getHit(0, j))).toEqual([[120, 300], [70, 120], [0, 70]])
    expect([0, 1].map(j => getHit(1, j))).toEqual([[200, 300], [0, 200]])
  })

  it('keep the circle and the slot at the end of a segment, and a zero segment to its point', () => {
    const bars = renderBars(data)
    expect(bars.getPointOffset(0, 1)).toMatchObject({ drawn: [0, 0], slot: [0, 0] })
    expect(bars.getPointOffset(1, 2).hit).toEqual([[0, 0], [0, 0]])
  })
})
