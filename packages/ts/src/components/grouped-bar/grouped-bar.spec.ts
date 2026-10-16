import { describe, expect, it } from 'vitest'
import { select } from 'd3-selection'

// Types
import { ScaleDimension } from '@/types/scale'
import { Orientation } from '@/types/position'
import { SnapDirection } from '@/types/data'

// Local
import { GroupedBar } from './index'
import * as s from './style'

type Datum = { x: number; a: number; b: number; c: number }

const WIDTH = 600
const HEIGHT = 300

/** Same order as the container: sizes and scales, then `bleed`, which prepares the bars */
function renderBars (data: Datum[], orientation = Orientation.Vertical): GroupedBar<Datum> {
  const bars = new GroupedBar<Datum>({ x: d => d.x, y: [d => d.a, d => d.b, d => d.c], orientation, roundedCorners: false, duration: 0 })
  bars.setData(data)
  bars.setSize(WIDTH, HEIGHT, WIDTH, HEIGHT)
  bars.setScaleDomain(ScaleDimension.X, [0, 4])
  bars.setScaleDomain(ScaleDimension.Y, [-50, 100])
  bars.setScaleRange(ScaleDimension.X, [0, WIDTH])
  bars.setScaleRange(ScaleDimension.Y, [HEIGHT, 0])
  expect(bars.bleed).toBeDefined()
  bars.render(0)
  return bars
}

function getBarEnds (bars: GroupedBar<Datum>, groupIndex: number): [number, number][] {
  const group = bars.g.selectAll<SVGGElement, Datum>(`.${s.barGroup}`).nodes()[groupIndex]
  const [groupX] = select(group).attr('transform').match(/translate\(([^,]+),([^)]+)\)/).slice(1).map(Number)
  const zero = bars.yScale(0)
  return [...group.querySelectorAll(`.${s.bar}`)].map(path => {
    const [, x, y, width] = path.getAttribute('d').match(/^M([^,]+),([^h]+)h([^a]+)a/).map(Number)
    const height = Number(path.getAttribute('d').match(/h0v0v([^a]+)a/)[1])
    return [groupX + x + width / 2, Math.abs(y - zero) > Math.abs(y + height - zero) ? y : y + height]
  })
}

describe('GroupedBar point offsets', () => {
  it('lead from the position of the values to the ends of the bars, stretched by `barMinHeight` too, and to their places in the group, snapping along X', () => {
    const data: Datum[] = [{ x: 1, a: 50, b: 0.1, c: -20 }, { x: 2, a: 0, b: 80, c: 30 }]
    const bars = renderBars(data)

    data.forEach((d, i) => {
      const ends = getBarEnds(bars, i)
      ;[d.a, d.b, d.c].forEach((value, j) => {
        const { circle, lines, direction } = bars.getCrosshairPointOffset(i, j)
        expect(bars.xScale(d.x) + circle[0]).toBeCloseTo(ends[j][0])
        expect(bars.yScale(value) + circle[1]).toBeCloseTo(ends[j][1])
        expect(lines).toEqual([circle[0], 0])
        expect(direction).toBe(SnapDirection.X)
      })
    })
  })

  it('snap horizontal bars along Y', () => {
    const bars = renderBars([{ x: 1, a: 50, b: 0.1, c: -20 }], Orientation.Horizontal)
    expect([0, 1, 2].map(j => bars.getCrosshairPointOffset(0, j)?.direction)).toEqual([SnapDirection.Y, SnapDirection.Y, SnapDirection.Y])
  })

  it('reports nothing for a missing value', () => {
    const bars = renderBars([{ x: 1, a: 50, b: undefined, c: 10 }])
    expect(bars.getCrosshairPointOffset(0, 1)).toBeUndefined()
  })
})
