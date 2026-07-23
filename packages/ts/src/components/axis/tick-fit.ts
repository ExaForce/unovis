// Types
import { Rect } from 'types/misc'
import { ContinuousScale } from 'types/scale'

// Utils
import { isEqual } from 'utils/data'
import { resolveRectsOverlap } from 'utils/text-overlap'

// Local Types
import { TickValues } from './types'

/** Tick value identity across renders; `+value` so equal `Date`s match */
export const tickKey = (value: number | Date): string => String(+value)

/** Merges two tick sets, deduplicated and sorted */
export const mergeTickValues = (a: TickValues, b: TickValues): TickValues => {
  const keys = new Set(a.map(tickKey))
  const extra = b.filter(value => !keys.has(tickKey(value)))
  return extra.length ? [...a, ...extra].sort((x, y) => +x - +y) : a
}

/** Returns the tick values to render as marks, restricting the step to 1 or 5 × 10^k.
 * Every coarser "nice" step is then a multiple of the mark step, so the label sets picked by
 * {@link findFittingTickValues} land on existing marks and label changes don't add or remove
 * ticks — visibility toggles animate in CSS with no tick lifecycle management.
 * Time scales are returned as is: their tick intervals don't form a nested ladder. */
export function getNestedTickValues (scale: ContinuousScale, maxNumTicks: number, values: TickValues = scale.ticks(maxNumTicks)): TickValues {
  if (values.length < 2 || values[0] instanceof Date) return values

  const step = (values[1] as number) - (values[0] as number)
  const stepMantissa = step / Math.pow(10, Math.floor(Math.log10(step)))
  if (Math.round(stepMantissa) !== 2) return values

  return scale.ticks(maxNumTicks * 2)
}

/** Generates candidate tick sets in decreasing size, from `maxNumTicks` down to a single tick.
 * Consecutive counts often produce the same "nice" values, so the sets are deduplicated. */
export function getTickValueCandidates (scale: ContinuousScale, maxNumTicks: number): TickValues[] {
  const candidates: TickValues[] = []
  for (let n = maxNumTicks; n >= 1; n -= 1) {
    const values: TickValues = scale.ticks(n)
    if (!candidates.length || !isEqual(values, candidates[candidates.length - 1])) candidates.push(values)
  }
  return candidates
}

/** Generates candidate subsets of a custom tick list in decreasing size — every value,
 * every 2nd, every 3rd and so on, anchored at the first value so the labeled ticks
 * stay evenly spaced. Used when explicit `tickValues` are fitted adaptively. */
export function getTickValueSubsetCandidates (values: TickValues): TickValues[] {
  const candidates: TickValues[] = []
  for (let k = 1; k <= values.length; k += 1) {
    const subset = values.filter((_, i) => i % k === 0)
    if (!candidates.length || subset.length < candidates[candidates.length - 1].length) candidates.push(subset)
  }
  return candidates
}

/** Finds the largest tick set whose labels don't overlap, among `candidates` ordered from
 * the densest to the sparsest (see {@link getTickValueCandidates}). Label rects come from
 * `getLabelRects`, which is expected to predict them without rendering (see
 * `Axis._getTickLabelRects`). The search stops at the first fitting candidate.
 * `tolerance` is forwarded to `resolveRectsOverlap`. */
export function findFittingTickValues (
  candidates: TickValues[],
  getLabelRects: (values: TickValues) => Rect[],
  tolerance = 0
): TickValues | undefined {
  for (const values of candidates) {
    if (resolveRectsOverlap(getLabelRects(values), { tolerance }).every(visible => visible)) return values
  }

  return candidates[candidates.length - 1]
}
