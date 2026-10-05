import { max, min } from 'd3-array'

// Utils
import { clamp, isNumber } from '@/utils/data'

// Types
import { ContinuousScale, ScaleDimension } from '@/types/scale'
import { Spacing } from '@/types/spacing'

// Local Types
import { ScatterPoint } from '../types'

// Config
import { ScatterConfigInterface } from '../config'

export type SpreadItem = {
  anchor: number;
  value: number;
  radius: number;
  min: number;
  max: number;
}

export type SpreadLayout = {
  offsets: number[];
  scale: number;
}

const EPSILON = 1e-6
const SCALE_TOLERANCE = 1.01

/** Merges the intervals the neighbors block along the spread axis, sorted by their start. Touching intervals stay
 * apart, because the point where they touch is free */
function mergeIntervals (intervals: [number, number][]): [number, number][] {
  intervals.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of intervals) {
    const last = merged[merged.length - 1]
    if (last && start < last[1] - EPSILON) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

function isBlocked (merged: [number, number][], position: number): boolean {
  let lo = 0
  let hi = merged.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (merged[mid][0] < position) lo = mid + 1
    else hi = mid - 1
  }
  const interval = merged[hi]
  return !!interval && position > interval[0] + EPSILON && position < interval[1] - EPSILON
}

/** Places the circles one by one, largest first, each at the free position closest to its anchor within its extent */
function place (items: SpreadItem[], scale: number, padding: number, stopOnOverflow = false): { offsets: number[]; fits: boolean } {
  const n = items.length
  const positions = new Float64Array(n)
  const isPlaced = new Uint8Array(n)
  const indices = items.map((d, i) => i)
  const byValue = [...indices].sort((a, b) => items[a].value - items[b].value)
  const valueRank = new Int32Array(n)
  byValue.forEach((i, rank) => { valueRank[i] = rank })
  const order = [...indices].sort((a, b) => (items[b].radius - items[a].radius) || (a - b))

  const gap = padding * scale
  const maxRadius = n ? items[order[0]].radius * scale : 0
  let fits = true

  for (let k = 0; k < n; k += 1) {
    const i = order[k]
    const { anchor, value } = items[i]
    const radius = items[i].radius * scale
    const reach = radius + maxRadius + gap

    const blocked: [number, number][] = []
    const block = (j: number): void => {
      if (!isPlaced[j]) return
      const distance = radius + items[j].radius * scale + gap
      const dv = value - items[j].value
      if (Math.abs(dv) >= distance) return
      const du = Math.sqrt(distance * distance - dv * dv)
      blocked.push([positions[j] - du, positions[j] + du])
    }
    for (let rank = valueRank[i] - 1; rank >= 0 && value - items[byValue[rank]].value < reach; rank -= 1) block(byValue[rank])
    for (let rank = valueRank[i] + 1; rank < n && items[byValue[rank]].value - value < reach; rank += 1) block(byValue[rank])
    const merged = mergeIntervals(blocked)

    const low = items[i].min + radius
    const high = items[i].max - radius
    const side = k % 2 ? 1 : -1
    const isCloser = (a: number, b: number | undefined): boolean => {
      if (b === undefined) return true
      const delta = Math.abs(a - anchor) - Math.abs(b - anchor)
      return Math.abs(delta) > EPSILON ? delta < 0 : side * (a - b) > 0
    }

    let position: number | undefined
    let nearestFree: number | undefined
    const consider = (candidate: number): void => {
      if (isCloser(candidate, nearestFree)) nearestFree = candidate
      if (candidate >= low - EPSILON && candidate <= high + EPSILON && isCloser(candidate, position)) position = candidate
    }
    for (const candidate of [anchor, low, high]) {
      if (!isBlocked(merged, candidate)) consider(candidate)
    }
    for (const [start, end] of merged) {
      consider(start)
      consider(end)
    }

    if (position === undefined) {
      fits = false
      if (stopOnOverflow) break
      position = low <= high ? clamp(nearestFree ?? anchor, low, high) : (items[i].min + items[i].max) / 2
    }

    positions[i] = position
    isPlaced[i] = 1
  }

  return { offsets: items.map((d, i) => positions[i] - d.anchor), fits }
}

/** Moves circles along one axis from their `anchor` so they don't overlap, keeping their `value` on the other axis.
 * When they don't fit their `[min, max]` extents, the radii and the padding shrink by one common `scale` until the
 * smallest circle is `minDiameter` across; past that the circles are clamped to their extents and may overlap. */
export function spread (items: SpreadItem[], padding: number, minDiameter = 1): SpreadLayout {
  const layout = place(items, 1, padding, true)
  if (layout.fits) return { offsets: layout.offsets, scale: 1 }

  const smallestRadius = min(items, d => d.radius > 0 ? d.radius : undefined)
  const minScale = smallestRadius ? Math.min(1, minDiameter / (2 * smallestRadius)) : 1
  if (!place(items, minScale, padding, true).fits) return { offsets: place(items, minScale, padding).offsets, scale: minScale }

  let fitting = minScale
  let overflowing = 1
  while (overflowing / fitting > SCALE_TOLERANCE) {
    const scale = Math.sqrt(fitting * overflowing)
    if (place(items, scale, padding, true).fits) fitting = scale
    else overflowing = scale
  }

  return { offsets: place(items, fitting, padding).offsets, scale: fitting }
}

/** The pixel extent `spreadMax` allows a point along `spreadAxis` */
export function getSpreadExtent<Datum> (
  d: ScatterPoint<Datum>,
  config: ScatterConfigInterface<Datum>,
  xScale: ContinuousScale,
  yScale: ContinuousScale
): [number, number] | undefined {
  if (!config.spreadAxis || !isNumber(config.spreadMax)) return undefined

  const isSpreadX = config.spreadAxis === ScaleDimension.X
  const scale = isSpreadX ? xScale : yScale
  const value = isSpreadX ? d._point.xValue : d._point.yValue
  const start = scale(value - config.spreadMax)
  const end = scale(value + config.spreadMax)
  if (!isFinite(start) || !isFinite(end)) return undefined

  return [Math.min(start, end), Math.max(start, end)]
}

/** The room `spreadMax` needs past the ends of the spread axis domain. It's found in domain units, because the range
 * shrinks by this very bleed: the extra domain past the ends takes `extra / (domain length + extra)` of the range */
export function getSpreadBleed<Datum> (
  points: ScatterPoint<Datum>[],
  config: ScatterConfigInterface<Datum>,
  xScale: ContinuousScale,
  yScale: ContinuousScale
): Spacing {
  const bleed = { top: 0, bottom: 0, left: 0, right: 0 }
  if (!config.spreadAxis || !isNumber(config.spreadMax) || !points.length) return bleed

  const isSpreadX = config.spreadAxis === ScaleDimension.X
  const scale = isSpreadX ? xScale : yScale
  const values = points.map(d => isSpreadX ? d._point.xValue : d._point.yValue)
  const [domainStart, domainEnd] = scale.domain().map(Number)
  const extraStart = Math.max(0, domainStart - (min(values) - config.spreadMax))
  const extraEnd = Math.max(0, (max(values) + config.spreadMax) - domainEnd)
  if (!extraStart && !extraEnd) return bleed

  const [rangeStart, rangeEnd] = scale.range()
  const pxPerUnit = Math.abs(rangeEnd - rangeStart) / (domainEnd - domainStart + extraStart + extraEnd)
  const [low, high] = rangeStart < rangeEnd
    ? [extraStart * pxPerUnit, extraEnd * pxPerUnit]
    : [extraEnd * pxPerUnit, extraStart * pxPerUnit]

  if (isSpreadX) return { ...bleed, left: low, right: high }
  return { ...bleed, top: low, bottom: high }
}
