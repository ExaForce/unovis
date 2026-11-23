import { pointer } from 'd3-selection'

/** Returns the zoom pivot in the `node` coordinates: the pointer, or the centre of the two touches that d3-zoom tracks.
 * A `touchend` of a double tap has no `touches` left, so the lifted touch is used instead */
export function getZoomPivot (
  sourceEvent: WheelEvent | MouseEvent | TouchEvent | undefined,
  node: Element
): [number, number] | undefined {
  if (!sourceEvent) return undefined

  const isTouchEvent = 'touches' in sourceEvent
  const touches = isTouchEvent ? Array.from(sourceEvent.touches.length ? sourceEvent.touches : sourceEvent.changedTouches ?? []).slice(0, 2) : []
  const points = isTouchEvent ? touches.map(t => pointer(t, node)) : [pointer(sourceEvent, node)]
  if (!points.length) return undefined

  const pivot: [number, number] = [
    points.reduce((acc, p) => acc + p[0], 0) / points.length,
    points.reduce((acc, p) => acc + p[1], 0) / points.length,
  ]
  return pivot.every(isFinite) ? pivot : undefined
}
