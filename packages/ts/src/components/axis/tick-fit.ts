import { CountableTimeInterval, timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time'

// Types
import { Rect } from '@/types/misc'
import { ContinuousScale } from '@/types/scale'

// Utils
import { isEqual } from '@/utils/data'
import { rectIntersect } from '@/utils/misc'
import { resolveRectsOverlap } from '@/utils/text-overlap'

// Local Types
import { AxisTimeTickUnit, FittedTickValues, TickSets, TickValues } from './types'

/** Tick value identity across renders; `+value` so equal `Date`s match */
export const tickKey = (value: number | Date): string => String(+value)

/** Merges two tick sets, deduplicated and sorted */
export const mergeTickValues = (a: TickValues, b: TickValues): TickValues => {
  const keys = new Set(a.map(tickKey))
  const extra = b.filter(value => !keys.has(tickKey(value)))
  if (!extra.length) return a

  return [...a, ...extra].sort((x, y) => +x - +y)
}

/** Returns the tick values to render as marks, restricting the step to 1 or 5 × 10^k.
 * Every coarser "nice" step is then a multiple of the mark step, so the label sets picked by
 * {@link findFittingTickValues} land on existing marks and label changes don't add or remove
 * ticks — visibility toggles animate in CSS with no tick lifecycle management.
 * Time scales are returned as is: their tick intervals don't form a nested ladder. */
export function getNestedTickValues (scale: ContinuousScale, maxNumTicks: number, values: TickValues = scale.ticks(maxNumTicks)): TickValues {
  if (values.length < 2 || values[0] instanceof Date) return values

  const step = (values[1] as number) - (values[0] as number)
  const stepPower = Math.floor(Math.log10(step))
  const stepMantissa = step / Math.pow(10, stepPower)
  if (Math.round(stepMantissa) !== 2) return values

  // Doubling the requested count makes d3 pick the next finer (1 × 10^k) step
  return scale.ticks(maxNumTicks * 2)
}

/** Generates candidate tick sets in decreasing size, from `maxNumTicks` down to a single tick.
 * Consecutive counts often produce the same "nice" values, so the sets are deduplicated. */
export function getTickValueCandidates (scale: ContinuousScale, maxNumTicks: number): TickValues[] {
  const candidates: TickValues[] = []
  for (let n = maxNumTicks; n >= 1; n -= 1) {
    const values: TickValues = scale.ticks(n)
    const previous = candidates[candidates.length - 1]
    if (!previous || !isEqual(values, previous)) candidates.push(values)
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
    const previous = candidates[candidates.length - 1]
    if (!previous || subset.length < previous.length) candidates.push(subset)
  }
  return candidates
}

/** Indices of the adjacent rect pairs that collide: `0` for the (0, 1) pair and so on.
 * The rects are expected to be ordered along one axis, the way tick labels are */
function getCollidingAdjacentPairs (rects: Rect[], tolerance: number): number[] {
  const pairs: number[] = []
  for (let pair = 0; pair < rects.length - 1; pair += 1) {
    if (rectIntersect(rects[pair], rects[pair + 1], tolerance)) pairs.push(pair)
  }
  return pairs
}

const fitsWithoutOverlap = (rects: Rect[], tolerance: number): boolean =>
  resolveRectsOverlap(rects, { tolerance }).every(visible => visible)

/** Accepts a candidate whose only colliding labels are the extreme (first / last) ones:
 * the extreme labels are dropped, while their ticks stay. `rects` are the candidate's
 * label rects, already known to not fit as a whole. */
function dropCollidingExtremes (
  fittedTicks: TickValues,
  rects: Rect[],
  getLabelRects: (values: TickValues) => Rect[],
  tolerance: number
): FittedTickValues | undefined {
  const collidingPairs = getCollidingAdjacentPairs(rects, tolerance)
  const firstPair = 0
  const lastPair = rects.length - 2
  const collidesOnExtremesOnly = collidingPairs.length > 0 &&
    collidingPairs.every(pair => pair === firstPair || pair === lastPair)
  if (!collidesOnExtremesOnly) return undefined

  const labeledTicks = [...fittedTicks]
  if (collidingPairs.includes(lastPair)) labeledTicks.pop()
  if (collidingPairs.includes(firstPair)) labeledTicks.shift()
  // A two-tick candidate loses both labels above — keep the first one, a single label always fits
  if (!labeledTicks.length) labeledTicks.push(fittedTicks[0])

  // The remaining labels get a wider fair share of the axis after the drop,
  // so the subset is re-measured before getting accepted
  if (fitsWithoutOverlap(getLabelRects(labeledTicks), tolerance)) return { fittedTicks, labeledTicks }
  return undefined
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
): FittedTickValues | undefined {
  for (const fittedTicks of candidates) {
    const rects = getLabelRects(fittedTicks)
    if (fitsWithoutOverlap(rects, tolerance)) return { fittedTicks, labeledTicks: fittedTicks }

    const fitted = dropCollidingExtremes(fittedTicks, rects, getLabelRects, tolerance)
    if (fitted) return fitted
  }

  const sparsestTicks = candidates[candidates.length - 1]
  return sparsestTicks && { fittedTicks: sparsestTicks, labeledTicks: sparsestTicks }
}

/** Time units of the uniform tick grid, coarsest first. `count` of these intervals
 * is arithmetic, so probing every unit is cheap */
const TIME_TICK_UNIT_INTERVALS: [AxisTimeTickUnit, CountableTimeInterval][] = [
  ['year', timeYear],
  ['month', timeMonth],
  ['week', timeWeek],
  ['day', timeDay],
  ['hour', timeHour],
  ['minute', timeMinute],
  ['second', timeSecond],
]

/** Hard cap on the uniform grid size. Counts this far beyond the requested number of ticks
 * only occur on degenerate domain / tick count combinations, which fall back to the nice sets */
const MAX_TIME_TICK_GRID_SIZE = 500

export type TimeTickGrid = {
  /** The calendar unit the grid is built of, reported to `tickFormat` */
  unit: AxisTimeTickUnit;
  /** All boundaries of `unit` within the scale domain */
  values: Date[];
}

/** Builds the base grid for the uniform time tick placement: all boundaries of one calendar
 * unit within the domain. The unit is the coarsest one that still provides `maxNumTicks`
 * boundaries, so the axis can label as densely as requested; short domains fall back to the
 * finest unit with at least two boundaries. Unlike the "nice" d3 time ticks, label steps over
 * this grid stay uniform — they never reset at month or year boundaries. */
export function getTimeTickBaseGrid (domain: TickValues, maxNumTicks: number): TimeTickGrid | undefined {
  const start = new Date(Math.min(+domain[0], +domain[domain.length - 1]))
  const end = new Date(Math.max(+domain[0], +domain[domain.length - 1]))
  if (Number.isNaN(+start) || !(+start < +end)) return undefined

  // Number of the interval's boundaries within [start, end]
  const boundaryCount = (interval: CountableTimeInterval): number =>
    interval.count(start, end) + (+interval.floor(start) === +start ? 1 : 0)

  const targetCount = Math.max(2, maxNumTicks)
  let finestFitting: [AxisTimeTickUnit, CountableTimeInterval] | undefined
  for (const unitInterval of TIME_TICK_UNIT_INTERVALS) {
    const count = boundaryCount(unitInterval[1])
    if (count > MAX_TIME_TICK_GRID_SIZE) break // the counts only grow towards the finer units
    if (count >= 2) finestFitting = unitInterval
    if (count >= targetCount) break // the coarsest unit dense enough
  }
  if (!finestFitting) return undefined

  const [unit, interval] = finestFitting
  // `range` excludes the stop value; +1ms makes a boundary right at the domain end included
  return { unit, values: interval.range(interval.ceil(start), new Date(+end + 1)) }
}

/** Number of every-`step`-th grid indices starting at `phase` */
const getPhaseSubsetSize = (gridSize: number, step: number, phase: number): number =>
  phase < gridSize ? Math.floor((gridSize - 1 - phase) / step) + 1 : 0

/** Natural cycles of the calendar units. A label step that divides the cycle (or is its whole
 * multiple) repeats identically every cycle, so it reads as familiar wall-clock steps; days,
 * weeks and years have no such cycle (month lengths vary — that's the reason this mode exists)
 * and accept any step. `getPosition` returns a value's position within the cycle, used to
 * prefer cycle-aligned phases (a 15-minute step starting at :00/:15/:30/:45, not at :05). */
const TIME_UNIT_CYCLES: Partial<Record<AxisTimeTickUnit, { length: number; getPosition: (date: Date) => number }>> = {
  second: { length: 60, getPosition: date => date.getSeconds() },
  minute: { length: 60, getPosition: date => date.getMinutes() },
  hour: { length: 24, getPosition: date => date.getHours() },
  month: { length: 12, getPosition: date => date.getMonth() },
}

/** Label steps to try for a unit with a `cycle`, in ascending order starting at `minStep`:
 * the divisors of the cycle, then its whole multiples up to one covering the grid */
function getCycleSnappedSteps (cycleLength: number, minStep: number, gridSize: number): number[] {
  const steps: number[] = []
  for (let step = 1; step <= cycleLength; step += 1) {
    if (cycleLength % step === 0) steps.push(step)
  }
  for (let step = cycleLength * 2; steps[steps.length - 1] < gridSize; step += cycleLength) steps.push(step)
  return steps.filter(step => step >= minStep)
}

/** How far the uniform label count may exceed the requested `maxNumTicks` — the "nice" d3
 * sets overshoot the requested count by a similar factor when the next coarser step is too
 * sparse, so the two modes end up with comparable label densities */
const UNIFORM_TICK_COUNT_SLACK = 1.5

/** Cap on the unlabeled tick marks, relative to `maxNumTicks` — the mark grid may be denser
 * than the labels, but not arbitrarily so */
const UNIFORM_TICK_MARKS_PER_LABEL = 4

/** Finds the densest uniform label placement over the time base grid: every `step`-th grid
 * value starting at some phase, so the labeled ticks are always evenly spaced. For each step
 * the phases are tried cycle-aligned first (see {@link TIME_UNIT_CYCLES}), then by decreasing
 * label count, and a phase where every label fits wins over an earlier one that would have to
 * drop its extreme labels. On units with a natural cycle the step snaps to the divisors and
 * whole multiples of that cycle. `maxNumTicks` bounds the label count the way it bounds the
 * "nice" sets, so fitting is driven by both the label geometry and the requested density.
 *
 * The label rects predicted by `getLabelRects` rely on cached text measurements, so a label
 * is only ever measured once; a measuring pass over the whole grid additionally bounds the
 * step from below (labels can't sit closer than the two narrowest of them at the widest grid
 * spacing), keeping the search near-linear in the grid size.
 *
 * The unlabeled tick marks (`originalTicks`) are the densest every-m-th subgrid with m
 * dividing the label step, so the labels land on existing marks. */
export function findUniformFittingTickValues (
  gridValues: TickValues,
  maxNumTicks: number,
  getLabelRects: (values: TickValues) => Rect[],
  tolerance = 0,
  unit?: AxisTimeTickUnit
): TickSets | undefined {
  const gridSize = gridValues.length
  if (gridSize < 2) return undefined

  const maxNumLabels = Math.max(1, Math.ceil(maxNumTicks * UNIFORM_TICK_COUNT_SLACK))
  const maxNumMarks = Math.max(maxNumLabels, maxNumTicks * UNIFORM_TICK_MARKS_PER_LABEL)

  const getSubset = (step: number, phase: number): TickValues => {
    const subset: TickValues = []
    for (let i = phase; i < gridSize; i += step) subset.push(gridValues[i])
    return subset
  }

  const buildTickSets = (fitted: FittedTickValues, step: number, phase: number): TickSets => {
    // The densest divisor of the label step within the mark budget keeps the marks
    // uniform too, with the labels landing on existing marks
    let markStep = step
    for (let m = 1; m < step; m += 1) {
      if (step % m === 0 && Math.ceil(gridSize / m) <= maxNumMarks) { markStep = m; break }
    }
    // Unlike the labels, the marks also extend to the left of `phase` (JS `%` keeps the
    // sign, so the negative remainders of divisible offsets still compare equal to 0)
    const originalTicks = markStep === step
      ? fitted.fittedTicks
      : gridValues.filter((_, i) => (i - phase) % markStep === 0)
    return { ...fitted, originalTicks }
  }

  // The measuring pass over the whole grid: bounds the step from below and warms the
  // text measurement cache. Backed off by one because the label anchors are not exactly
  // the rect centers under rotation or custom alignment
  const gridRects = getLabelRects(gridValues)
  const centers = gridRects.map(rect => rect.x + rect.width / 2)
  let maxGridGap = 0
  for (let i = 1; i < gridSize; i += 1) maxGridGap = Math.max(maxGridGap, Math.abs(centers[i] - centers[i - 1]))
  const widths = gridRects.map(rect => rect.width).sort((a, b) => a - b)
  const minPairWidth = (widths[0] + widths[1]) / 2
  const minStepByWidth = maxGridGap > 0 ? Math.ceil(minPairWidth / maxGridGap) - 1 : 1
  // The step below which the labels would exceed the requested count
  const minStepByCount = Math.ceil(gridSize / maxNumLabels)
  const minStep = Math.min(gridSize, Math.max(1, minStepByWidth, minStepByCount))

  // On cyclic units only the snapped steps are tried; the last one always covers the grid,
  // and its single-label subsets fit unconditionally, so the search still terminates
  const cycle = unit && TIME_UNIT_CYCLES[unit]
  const steps = cycle
    ? getCycleSnappedSteps(cycle.length, minStep, gridSize)
    : Array.from({ length: gridSize - minStep + 1 }, (_, i) => minStep + i)

  for (const step of steps) {
    // A label sitting on a multiple of the step within the cycle keeps the whole set
    // wall-clock aligned (:00 / :15 / :30 rather than :05 / :20 / :35)
    const alignedStep = cycle ? Math.min(step, cycle.length) : 1
    const isAligned = (phase: number): boolean =>
      !!cycle && cycle.getPosition(gridValues[phase] as Date) % alignedStep === 0

    // Phases ordered aligned-first, then by their label count, so the step is used to its fullest
    const phases = Array.from({ length: Math.min(step, gridSize) }, (_, phase) => phase)
      .sort((a, b) =>
        Number(isAligned(b)) - Number(isAligned(a)) ||
        getPhaseSubsetSize(gridSize, step, b) - getPhaseSubsetSize(gridSize, step, a) ||
        a - b)

    // A phase where every label fits wins over an earlier phase that would drop extremes,
    // so the extreme-drop pass only runs when no phase fits fully
    const evaluated: { phase: number; subset: TickValues; rects: Rect[] }[] = []
    for (const phase of phases) {
      const subset = getSubset(step, phase)
      const rects = getLabelRects(subset)
      if (fitsWithoutOverlap(rects, tolerance)) {
        return buildTickSets({ fittedTicks: subset, labeledTicks: subset }, step, phase)
      }
      evaluated.push({ phase, subset, rects })
    }
    for (const { phase, subset, rects } of evaluated) {
      const fitted = dropCollidingExtremes(subset, rects, getLabelRects, tolerance)
      if (fitted) return buildTickSets(fitted, step, phase)
    }
  }

  // Unreachable: the single-tick subsets at `step === gridSize` always fit
  return undefined
}
