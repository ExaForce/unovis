import { least, range, ticks, tickStep } from 'd3-array'
import { scaleLinear, ScaleLinear } from 'd3-scale'

// Types
import { DurationUnit, ScaleDuration } from '@/types/duration'

// Constants
import { DURATION_SECOND, DURATION_TICK_DECIMAL_MULTIPLES, DURATION_TICK_UNITS } from './constants'

/** Tick steps in ascending order: the multiples of each unit up to `maxUnit`,
 * then 1, 2 and 5 × 10^k of `maxUnit` until a step reaches the target */
function * getDurationTickSteps (target: number, maxUnit: DurationUnit): Generator<number> {
  for (const { unit, duration, multiples } of DURATION_TICK_UNITS) {
    yield * multiples.map(multiple => multiple * duration)
    if (unit !== maxUnit) continue

    let step = multiples[multiples.length - 1] * duration
    for (let power = duration; step < target; power *= 10) {
      for (const multiple of DURATION_TICK_DECIMAL_MULTIPLES) {
        if (multiple * power <= step) continue
        step = multiple * power
        yield step
      }
    }
    return
  }
}

/** The tick step closest to the target on a log scale, picked the way d3 picks time intervals.
 * Decimal below a millisecond */
function getDurationTickStep (min: number, max: number, count: number, maxUnit: DurationUnit): number {
  const target = (max - min) / count
  if (!(target >= 1 && target < Infinity)) return tickStep(min, max, count)
  return least(getDurationTickSteps(target, maxUnit), step => Math.abs(Math.log(step / target)))
}

function getDurationTicks (start: number, stop: number, count: number, maxUnit: DurationUnit): number[] {
  if (!(count > 0)) return []
  if (start === stop) return [start]

  const [min, max] = start < stop ? [start, stop] : [stop, start]
  const step = getDurationTickStep(min, max, count, maxUnit)
  if (step < DURATION_SECOND) return ticks(start, stop, count)

  const values = range(Math.ceil(min / step), Math.floor(max / step) + 1).map(i => i * step)
  if (!values.length && count < 2) return getDurationTicks(start, stop, count * 2, maxUnit)
  return start < stop ? values : values.reverse()
}

function withDurationTicks (scale: ScaleLinear<number, number>, maxUnit: DurationUnit): ScaleDuration {
  const durationScale = scale as ScaleDuration
  const linearCopy = scale.copy
  const linearNice = durationScale.nice

  durationScale.ticks = (count = 10) => {
    const domain = scale.domain()
    return getDurationTicks(domain[0], domain[domain.length - 1], count, maxUnit)
  }

  durationScale.nice = (count = 10) => {
    const domain = scale.domain()
    const [i0, i1] = domain[0] <= domain[domain.length - 1] ? [0, domain.length - 1] : [domain.length - 1, 0]
    let min = domain[i0]
    let max = domain[i1]
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const step = getDurationTickStep(min, max, count, maxUnit)
      if (step < DURATION_SECOND) return linearNice(count)

      const niceMin = Math.floor(min / step) * step
      const niceMax = Math.ceil(max / step) * step
      if (niceMin === min && niceMax === max) break
      min = niceMin
      max = niceMax
    }
    domain[i0] = min
    domain[i1] = max
    return durationScale.domain(domain)
  }

  durationScale.maxUnit = ((unit?: DurationUnit) => {
    if (unit === undefined) return maxUnit
    maxUnit = unit
    return durationScale
  }) as ScaleDuration['maxUnit']

  durationScale.copy = () => withDurationTicks(linearCopy(), maxUnit)
  return durationScale
}

/** A linear scale over durations in milliseconds. Its ticks and `nice` land on whole milliseconds,
 * seconds, minutes, hours, days or weeks (1m, 2m, 5m, 10m, 15m…), counted from zero */
export function scaleDuration (): ScaleDuration {
  return withDurationTicks(scaleLinear(), DurationUnit.Week)
}
