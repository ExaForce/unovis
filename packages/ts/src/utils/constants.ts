// Types
import { DurationUnit } from '@/types/duration'

export const DURATION_SECOND = 1000
const DURATION_MINUTE = 60 * DURATION_SECOND
const DURATION_HOUR = 60 * DURATION_MINUTE
const DURATION_DAY = 24 * DURATION_HOUR
const DURATION_WEEK = 7 * DURATION_DAY

/** Duration tick steps in ascending order, as multiples of each unit */
export const DURATION_TICK_UNITS: { unit: DurationUnit; duration: number; multiples: number[] }[] = [
  { unit: DurationUnit.Millisecond, duration: 1, multiples: [1, 2, 5, 10, 20, 50, 100, 200, 500] },
  { unit: DurationUnit.Second, duration: DURATION_SECOND, multiples: [1, 2, 5, 10, 15, 30] },
  { unit: DurationUnit.Minute, duration: DURATION_MINUTE, multiples: [1, 2, 5, 10, 15, 30] },
  { unit: DurationUnit.Hour, duration: DURATION_HOUR, multiples: [1, 2, 3, 6, 12] },
  { unit: DurationUnit.Day, duration: DURATION_DAY, multiples: [1, 2, 5, 10, 20] },
  { unit: DurationUnit.Week, duration: DURATION_WEEK, multiples: [5, 10, 20] },
]

/** The multiples the largest allowed unit goes on with, times 10^k */
export const DURATION_TICK_DECIMAL_MULTIPLES = [1, 2, 5]
