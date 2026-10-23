import { afterEach, describe, expect, it, vi } from 'vitest'
import { XYContainer } from '@/containers/xy-container'
import { XYContainerConfigInterface } from '@/containers/xy-container/config'
import { Line } from '@/components/line'
import { LineConfigInterface } from '@/components/line/config'
import { Scale } from '@/types/scale'

type Datum = { x: number; a: number; b: number }
type XYContainerInternals = Pick<XYContainer<Datum>, 'updateContainer' | 'updateComponents' | 'destroy'> & { _preRender: () => void }

const data: Datum[] = [{ x: 0, a: 1, b: 50 }, { x: 1, a: 2, b: 90 }]

const containers: XYContainerInternals[] = []
afterEach(() => {
  containers.splice(0).forEach(c => c.destroy())
  vi.restoreAllMocks()
})

function setup (config: XYContainerConfigInterface<Datum>): XYContainerInternals {
  const container = new XYContainer<Datum>(document.createElement('div'), { width: 500, height: 300, ...config }, data) as unknown as XYContainerInternals
  containers.push(container)
  container._preRender()
  return container
}

const rebind = (line: Line<Datum>, yScaleKey: string | undefined): LineConfigInterface<Datum> => ({ ...line.config, yScaleKey })

describe('XYContainer scale instances', () => {
  it('gives a component its own scale instance back when it moves to a key without one', () => {
    const volScale = Scale.scaleLinear()
    const moved = new Line<Datum>({ x: d => d.x, y: d => d.a, yScaleKey: 'vol' })
    const volume = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'vol' })
    const primary = new Line<Datum>({ x: d => d.x, y: d => 2 * d.a })
    const container = setup({ components: [moved, volume, primary], yScales: { vol: { scale: volScale } } })
    expect(moved.yScale).toBe(volScale)

    container.updateComponents([rebind(moved, undefined), volume.config, primary.config], true)
    container._preRender()
    expect(moved.yScale).not.toBe(volScale)
    expect(moved.yScale.domain()).toEqual([1, 4])
    expect(volScale.domain()).toEqual([50, 90])
  })

  it('gives the components their own scale instances back when the configured one is removed', () => {
    const logScale = Scale.scaleLog()
    const line = new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'vol' })
    const container = setup({ components: [line], yScales: { vol: { scale: logScale } } })
    expect(line.yScale).toBe(logScale)

    container.updateContainer({ components: [line], yScales: { vol: {} }, width: 500, height: 300 }, true)
    container._preRender()
    expect(line.yScale).not.toBe(logScale)
    expect(line.yScale.domain()).toEqual([50, 90])
  })

  it('keeps the primary domain when a component sharing the primary instance moves to another key', () => {
    const shared = Scale.scaleLinear()
    const a = new Line<Datum>({ x: d => d.x, y: d => d.a })
    const b = new Line<Datum>({ x: d => d.x, y: d => d.b })
    const container = setup({ components: [a, b], yScale: shared })
    expect(shared.domain()).toEqual([1, 90])

    container.updateComponents([a.config, rebind(b, 'pct')], true)
    container._preRender()
    expect(shared.domain()).toEqual([1, 2])
    expect(b.yScale).not.toBe(shared)
    expect(b.yScale.domain()).toEqual([50, 90])
  })

  it('warns once when one instance is configured for several scales', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const scale = Scale.scaleLinear()
    const container = setup({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a }), new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'other' })],
      yScale: scale,
      yScales: { other: { scale } },
    })
    container._preRender()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/^Unovis \| XY Container: /)
  })

  it('does not warn when every scale has its own instance', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setup({
      components: [new Line<Datum>({ x: d => d.x, y: d => d.a }), new Line<Datum>({ x: d => d.x, y: d => d.b, yScaleKey: 'other' })],
      xScale: Scale.scaleLinear(),
      yScale: Scale.scaleLinear(),
      yScales: { other: { scale: Scale.scaleLinear() } },
    })

    expect(warn).not.toHaveBeenCalled()
  })
})
