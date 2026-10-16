import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { getNearest2D } from '@/utils/data'

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
    const pointHit = (i: number): [[number, number], [number, number]] | undefined => (i === 1 ? [[-10, 5], [-10, 5]] : undefined)

    const nearest = getNearest2D(data, [0, 5], scale, scale, d => d.x, [d => d.a], [], undefined, pointHit)
    expect(nearest).toEqual({ datum: data[1], index: 1, seriesIndex: 0, distanceSq: 0 })
  })

  it('measures the distance to the segment a point answers for, e.g. a bar from its base to its end', () => {
    const data: Datum[] = [{ x: 0, a: 100 }, { x: 10, a: 30 }]
    const scale = scaleLinear()
    const fromZero = (i: number): [[number, number], [number, number]] => [[0, -data[i].a], [0, 0]]

    expect(getNearest2D(data, [2, 20], scale, scale, d => d.x, [d => d.a])?.index).toBe(1)
    expect(getNearest2D(data, [2, 20], scale, scale, d => d.x, [d => d.a], [], undefined, fromZero)).toMatchObject({ index: 0, distanceSq: 4 })
  })

  it('reports the series of the nearest point, counting the stacked ones first', () => {
    const data: Datum[] = [{ x: 0, a: 1 }, { x: 1, a: 2 }]
    const scale = scaleLinear()
    const nearest = getNearest2D(data, [1, 10], scale, scale, d => d.x, [d => d.a, d => d.a * 5], [d => d.a])
    expect(nearest).toMatchObject({ index: 1, seriesIndex: 2 })
  })
})
