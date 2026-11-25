import { beforeAll, describe, expect, it } from 'vitest'
import { select } from 'd3-selection'
import { ZoomBehavior } from 'd3-zoom'

// Types
import { Position } from '@/types/position'
import { Spacing } from '@/types/spacing'
import { VerticalAlign } from '@/types/text'

// Local
import { Sankey } from './index'
import { SankeyConfigInterface } from './config'
import { SankeyZoomMode } from './types'
import { getZoomPivot } from './modules/zoom'

type Node = { id: string; label?: string; subLabel?: string }
type Link = { source: string; target: string; value: number }

type SankeyInternals = {
  _zoomBehavior: ZoomBehavior<SVGGElement, unknown>;
  _bleedCached: Spacing;
  _edgeLabelsCached: { maxWidth: number; left: number; right: number };
  _getConstrainedPan: (pan: [number, number]) => [number, number];
}

const WIDTH = 600
const HEIGHT = 400

const nodes: Node[] = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, label: `Node ${id.toUpperCase()}` }))
const links: Link[] = [
  { source: 'a', target: 'c', value: 3 },
  { source: 'b', target: 'c', value: 2 },
  { source: 'c', target: 'd', value: 4 },
  { source: 'c', target: 'e', value: 1 },
]

// jsdom doesn't lay out SVG text, so the labels measure through this
beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
    configurable: true,
    value (this: SVGElement): number { return (this.textContent?.length ?? 0) * 6 },
  })
})

const internals = (sankey: Sankey<Node, Link>): SankeyInternals => sankey as unknown as SankeyInternals

function renderSankey (config: SankeyConfigInterface<Node, Link>, data = { nodes, links }): Sankey<Node, Link> {
  const sankey = new Sankey<Node, Link>({ duration: 0, labelFontSize: 12, subLabelFontSize: 10, ...config })
  sankey.setData(data)
  sankey.setSize(WIDTH, HEIGHT, WIDTH, HEIGHT)
  sankey.render(0)
  return sankey
}

type TouchPoint = { identifier: number; clientX: number; clientY: number }

/** jsdom has no `Touch`, so we attach the touch lists to a plain cancelable event */
function dispatchTouch (node: Element, type: string, touches: TouchPoint[], changedTouches: TouchPoint[]): void {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'changedTouches', { value: changedTouches })
  node.dispatchEvent(event)
}

/** Renders a zoomable chart at 2x, so the pan has room to keep the pivot in place */
function renderZoomedSankey (zoomMode: SankeyZoomMode): Sankey<Node, Link> {
  const sankey = renderSankey({ enableZoom: true, zoomMode })
  // jsdom doesn't implement the SVG lengths d3-zoom reads its default extent from
  internals(sankey)._zoomBehavior.extent([[0, 0], [WIDTH, HEIGHT]])
  sankey.setZoomScale(2, 2, 0)
  return sankey
}

/** Maps a point of the chart to the unscaled layout, the way `Sankey._onZoom` does */
function toLayout (sankey: Sankey<Node, Link>, point: [number, number]): [number, number] {
  const bleed = internals(sankey)._bleedCached
  const [h, v] = sankey.getZoomScale()
  const [panX, panY] = sankey.getPan()
  const minX = Math.min(...sankey.datamodel.nodes.map(d => d.x0))
  const minY = Math.min(...sankey.datamodel.nodes.map(d => d.y0))
  return [
    minX + (point[0] - bleed.left - panX - minX) / h,
    minY + (point[1] - bleed.top - panY - minY) / v,
  ]
}

describe('Sankey zoom', () => {
  it('zooms on a pinch and keeps the point between the fingers under them', () => {
    const sankey = renderZoomedSankey(SankeyZoomMode.XY)
    const g = sankey.g.node()
    const center: [number, number] = [300, 200]
    const layoutPoint = toLayout(sankey, center)

    const start = [{ identifier: 1, clientX: 250, clientY: 200 }, { identifier: 2, clientX: 350, clientY: 200 }]
    dispatchTouch(g, 'touchstart', start, start)
    const spread = [{ identifier: 1, clientX: 225, clientY: 200 }, { identifier: 2, clientX: 375, clientY: 200 }]
    dispatchTouch(g, 'touchmove', spread, spread)
    dispatchTouch(g, 'touchend', [], spread)

    expect(sankey.getZoomScale()[0]).toBeCloseTo(3)
    expect(sankey.getZoomScale()[1]).toBeCloseTo(3)
    expect(toLayout(sankey, center)[0]).toBeCloseTo(layoutPoint[0])
    expect(toLayout(sankey, center)[1]).toBeCloseTo(layoutPoint[1])
  })

  it('moves the chart with the fingers when they move together during a pinch', () => {
    const sankey = renderZoomedSankey(SankeyZoomMode.XY)
    const g = sankey.g.node()
    const layoutPoint = toLayout(sankey, [300, 200])

    const touches = (spread: number, dx: number, dy: number): TouchPoint[] => [
      { identifier: 1, clientX: 300 - spread + dx, clientY: 200 + dy },
      { identifier: 2, clientX: 300 + spread + dx, clientY: 200 + dy },
    ]
    dispatchTouch(g, 'touchstart', touches(50, 0, 0), touches(50, 0, 0))
    dispatchTouch(g, 'touchmove', touches(60, -10, 10), touches(60, -10, 10))
    dispatchTouch(g, 'touchmove', touches(70, -20, 20), touches(70, -20, 20))
    dispatchTouch(g, 'touchmove', touches(75, -30, 30), touches(75, -30, 30))

    expect(sankey.getZoomScale()[0]).toBeCloseTo(3)
    expect(toLayout(sankey, [270, 230])[0]).toBeCloseTo(layoutPoint[0])
    expect(toLayout(sankey, [270, 230])[1]).toBeCloseTo(layoutPoint[1])
  })

  it('zooms only vertically on a pinch in the `Y` zoom mode', () => {
    const sankey = renderZoomedSankey(SankeyZoomMode.Y)
    const g = sankey.g.node()
    const panX = sankey.getPan()[0]

    const start = [{ identifier: 1, clientX: 300, clientY: 150 }, { identifier: 2, clientX: 300, clientY: 250 }]
    dispatchTouch(g, 'touchstart', start, start)
    const spread = [{ identifier: 1, clientX: 290, clientY: 125 }, { identifier: 2, clientX: 290, clientY: 275 }]
    dispatchTouch(g, 'touchmove', spread, spread)

    expect(sankey.getZoomScale()).toEqual([2, expect.closeTo(3)])
    expect(sankey.getPan()[0]).toBe(panX)
  })

  it('zooms in on a double tap around the tapped point', () => {
    const sankey = renderZoomedSankey(SankeyZoomMode.XY)
    internals(sankey)._zoomBehavior.duration(0)
    const g = sankey.g.node()
    const tap = [{ identifier: 1, clientX: 320, clientY: 180 }]
    const layoutPoint = toLayout(sankey, [320, 180])

    for (let i = 0; i < 2; i += 1) {
      dispatchTouch(g, 'touchstart', tap, tap)
      dispatchTouch(g, 'touchend', [], tap)
    }

    expect(sankey.getZoomScale()[0]).toBeCloseTo(4)
    expect(sankey.getZoomScale()[1]).toBeCloseTo(4)
    expect(toLayout(sankey, [320, 180])[0]).toBeCloseTo(layoutPoint[0])
    expect(toLayout(sankey, [320, 180])[1]).toBeCloseTo(layoutPoint[1])
  })

  it('keeps the point under the mouse in place on a wheel zoom', () => {
    const sankey = renderZoomedSankey(SankeyZoomMode.XY)
    const g = sankey.g.node()
    const layoutPoint = toLayout(sankey, [280, 220])

    g.dispatchEvent(new WheelEvent('wheel', { clientX: 280, clientY: 220, deltaY: -100, bubbles: true, cancelable: true }))

    expect(sankey.getZoomScale()[0]).toBeGreaterThan(2)
    expect(toLayout(sankey, [280, 220])[0]).toBeCloseTo(layoutPoint[0])
    expect(toLayout(sankey, [280, 220])[1]).toBeCloseTo(layoutPoint[1])
  })

  it('has no pivot for a touch event without touches', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const event = new Event('touchend')
    Object.defineProperty(event, 'touches', { value: [] })
    Object.defineProperty(event, 'changedTouches', { value: [] })
    expect(getZoomPivot(event as TouchEvent, g)).toBeUndefined()
  })
})

describe('Sankey bleed', () => {
  const getBleed = (config: SankeyConfigInterface<Node, Link>, label: (id: string) => string = id => `Node ${id.toUpperCase()}`): Spacing => {
    const sankey = new Sankey<Node, Link>({ duration: 0, labelFontSize: 12, subLabelFontSize: 10, ...config })
    sankey.setData({ nodes: nodes.map(d => ({ ...d, label: label(d.id) })), links: links.map(l => ({ ...l })) })
    sankey.setSize(WIDTH, HEIGHT, WIDTH, HEIGHT)
    return sankey.bleed
  }

  const expectBleed = (bleed: Spacing, expected: Spacing): void => {
    for (const side of ['top', 'bottom', 'left', 'right'] as const) expect(bleed[side]).toBeCloseTo(expected[side])
  }

  it('reserves the same space as before for labels with text', () => {
    // The label reserve is 43px high, a third of it at the middle alignment; "Node A" is 41.6px wide plus 33px of padding
    expectBleed(getBleed({}), { top: 43 / 3, bottom: 43 / 3, left: 74.6, right: 74.6 })
    expectBleed(getBleed({ labelVerticalAlign: VerticalAlign.Top }), { top: 0, bottom: 43, left: 74.6, right: 74.6 })
    expectBleed(getBleed({ labelVerticalAlign: VerticalAlign.Bottom }), { top: 43, bottom: 0, left: 74.6, right: 74.6 })
    expectBleed(getBleed({ selectedNodeIds: ['a'] }), { top: 4 + 43 / 3, bottom: 4 + 43 / 3, left: 74.6, right: 74.6 })
    expectBleed(getBleed({ labelPosition: Position.Left }), { top: 43 / 3, bottom: 43 / 3, left: 74.6, right: 0 })
    expectBleed(getBleed({ labelPosition: Position.Right }), { top: 43 / 3, bottom: 43 / 3, left: 0, right: 74.6 })
    expectBleed(getBleed({ subLabel: 'Sub' }, () => ''), { top: 43 / 3, bottom: 43 / 3, left: 51.5, right: 51.5 })
  })

  it('reserves no label space when the labels have no text', () => {
    expectBleed(getBleed({}, () => ''), { top: 0, bottom: 0, left: 0, right: 0 })
    expectBleed(getBleed({ labelVerticalAlign: VerticalAlign.Top }, () => ''), { top: 0, bottom: 0, left: 0, right: 0 })
    expectBleed(getBleed({ selectedNodeIds: ['a'] }, () => ''), { top: 4, bottom: 4, left: 4, right: 4 })
  })

  it('reserves label space only on the sides where a label has text', () => {
    const bleed = getBleed({}, id => (['d', 'e'].includes(id) ? `Node ${id.toUpperCase()}` : ''))
    expectBleed(bleed, { top: 43 / 3, bottom: 43 / 3, left: 0, right: 74.6 })
  })
})

describe('Sankey labels on a zoom', () => {
  const LABEL_MAX_WIDTH = 60
  const LABEL_PADDING = 33
  const longLabel = (id: string): string => `A long label of the node ${id.toUpperCase()}`
  const longNodes = nodes.map(d => ({ ...d, label: longLabel(d.id) }))

  const renderLabelled = (config: SankeyConfigInterface<Node, Link>, data = { nodes: longNodes, links: links.map(l => ({ ...l })) }): Sankey<Node, Link> =>
    renderSankey({ enableZoom: true, zoomMode: SankeyZoomMode.XY, labelMaxWidth: LABEL_MAX_WIDTH, labelExpandTrimmedOnHover: false, ...config }, data)

  const labelTexts = (sankey: Sankey<Node, Link>): Record<string, string> => Object.fromEntries(
    Array.from(sankey.element.querySelectorAll<SVGTextElement>(`.${Sankey.selectors.label}`))
      .map(el => [(select(el).datum() as Node).id, el.textContent])
  )

  /** The pan at its limit on a side, and the room it leaves between the edge node and the edge of the chart */
  const roomAtPanLimit = (sankey: Sankey<Node, Link>, side: 'left' | 'right'): number => {
    const bleed = internals(sankey)._bleedCached
    const pan = internals(sankey)._getConstrainedPan([side === 'right' ? -1e6 : 1e6, 0])
    const layoutNodes = sankey.datamodel.nodes
    return side === 'right'
      ? WIDTH - (bleed.left + pan[0] + Math.max(...layoutNodes.map(d => d.x1)))
      : bleed.left + pan[0] + Math.min(...layoutNodes.map(d => d.x0))
  }

  it('trims the labels to `labelMaxWidth` at the zoom scale of 1', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right })
    const texts = labelTexts(sankey)
    for (const d of longNodes) expect(texts[d.id]).not.toBe(d.label)
    expect(roomAtPanLimit(sankey, 'right')).toBeCloseTo(LABEL_MAX_WIDTH + LABEL_PADDING)
  })

  it('gives the labels of every layer the room of a layer on a horizontal zoom in', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right })
    sankey.setZoomScale(4, 1, 0)
    const texts = labelTexts(sankey)
    for (const d of longNodes) expect(texts[d.id]).toBe(d.label)
  })

  it('keeps the layout bleed, and lets the pan go as far as the last layer labels do', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right })
    const bleed = { ...internals(sankey)._bleedCached }
    sankey.setZoomScale(4, 1, 0)
    expect(internals(sankey)._bleedCached).toEqual(bleed)

    const neededWidth = internals(sankey)._edgeLabelsCached.right
    expect(neededWidth).toBeGreaterThan(LABEL_MAX_WIDTH)
    expect(roomAtPanLimit(sankey, 'right')).toBeCloseTo(neededWidth + LABEL_PADDING)
    expect(roomAtPanLimit(sankey, 'left')).toBeCloseTo(0)
  })

  it('limits the labels to the zoomed `labelMaxWidth`', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right })
    sankey.setZoomScale(1.5, 1, 0)
    const texts = labelTexts(sankey)
    for (const d of longNodes) expect(texts[d.id]).not.toBe(d.label)
    expect(roomAtPanLimit(sankey, 'right')).toBeCloseTo(LABEL_MAX_WIDTH * 1.5 + LABEL_PADDING)
  })

  it('adds no room when the labels fit at the zoom scale of 1', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right, labelMaxWidth: 300 }, { nodes: nodes.map(d => ({ ...d })), links: links.map(l => ({ ...l })) })
    const room = roomAtPanLimit(sankey, 'right')
    sankey.setZoomScale(4, 1, 0)
    expect(roomAtPanLimit(sankey, 'right')).toBeCloseTo(room)
  })

  it('gives the labels on the left of the first layer the same room', () => {
    const sankey = renderLabelled({ labelPosition: Position.Left })
    expect(roomAtPanLimit(sankey, 'left')).toBeCloseTo(LABEL_MAX_WIDTH + LABEL_PADDING)
    sankey.setZoomScale(4, 1, 0)
    const texts = labelTexts(sankey)
    for (const d of longNodes) expect(texts[d.id]).toBe(d.label)
    expect(roomAtPanLimit(sankey, 'left')).toBeCloseTo(internals(sankey)._edgeLabelsCached.left + LABEL_PADDING)
  })

  it('does not make the labels wider on a vertical zoom', () => {
    const sankey = renderLabelled({ labelPosition: Position.Right })
    sankey.setZoomScale(1, 4, 0)
    const texts = labelTexts(sankey)
    for (const d of longNodes) expect(texts[d.id]).not.toBe(d.label)
    expect(roomAtPanLimit(sankey, 'right')).toBeCloseTo(LABEL_MAX_WIDTH + LABEL_PADDING)
  })
})
