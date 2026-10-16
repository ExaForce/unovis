import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { getNearest2D } from '@/utils/data'
import { SnapDirection } from '@/types/data'

type Datum = { x: number; a: number }

describe('getNearest2D', () => {
  it('reads the stacked values with the datum index', () => {
    const data: Datum[] = [{ x: 0, a: 1 }, { x: 1, a: 2 }, { x: 2, a: 3 }]
    const scale = scaleLinear()
    const yStacked = [(d: Datum, i: number) => i === 2 ? d.a : undefined]

    const nearest = getNearest2D(data, [2, 3], scale, scale, d => d.x, [], yStacked)
    expect(nearest?.index).toBe(2)
  })

  it('measures the distance to where the points are drawn', () => {
    const data: Datum[] = [{ x: 0, a: 0 }, { x: 10, a: 0 }]
    const scale = scaleLinear()
    const getSnapOffset = (i: number): { offset: [number, number] } | undefined => (i === 1 ? { offset: [-10, 5] } : undefined)

    const nearest = getNearest2D(data, [0, 5], scale, scale, d => d.x, [d => d.a], [], undefined, getSnapOffset)
    expect(nearest).toEqual({ datum: data[1], index: 1, seriesIndex: 0, distanceSq: 0 })
  })

  it('measures the distance along one axis only when asked, e.g. to pick a bar anywhere in its column or row', () => {
    const data: Datum[] = [{ x: 0, a: 0 }, { x: 10, a: 10 }]
    const scale = scaleLinear()
    const nearest = (point: [number, number], direction?: SnapDirection): { index: number; distanceSq: number } | undefined =>
      getNearest2D(data, point, scale, scale, d => d.x, [d => d.a], [], undefined, () => ({ offset: [0, 0], direction }))

    expect(nearest([6, 1])).toMatchObject({ index: 0, distanceSq: 37 })
    expect(nearest([6, 1], SnapDirection.X)).toMatchObject({ index: 1, distanceSq: 16 })
    expect(nearest([1, 6], SnapDirection.Y)).toMatchObject({ index: 1, distanceSq: 16 })
  })

  it('reports the series of the nearest point, counting the stacked ones first', () => {
    const data: Datum[] = [{ x: 0, a: 1 }, { x: 1, a: 2 }]
    const scale = scaleLinear()
    const nearest = getNearest2D(data, [1, 10], scale, scale, d => d.x, [d => d.a, d => d.a * 5], [d => d.a])
    expect(nearest).toMatchObject({ index: 1, seriesIndex: 2 })
  })
})
