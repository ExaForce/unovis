import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { DurationUnit } from '@/types/duration'
import { scaleDuration } from '@/utils/scale-duration'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const ticksOf = (domain: number[], count: number, maxUnit = DurationUnit.Week): number[] =>
  scaleDuration().maxUnit(maxUnit).domain(domain).ticks(count)
const multiplesOf = (step: number, from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => (from + i) * step)

describe('scaleDuration', () => {
  it('steps over whole minutes or half-minutes on 0–300s, never 100s', () => {
    expect(ticksOf([0, 300 * SECOND], 5)).toEqual(multiplesOf(MINUTE, 0, 5))
    for (let count = 2; count <= 12; count += 1) {
      ticksOf([0, 300 * SECOND], count).forEach(tick => expect(tick % (30 * SECOND)).toBe(0))
    }
  })

  it('uses decimal milliseconds below a second', () => {
    expect(ticksOf([0, 1500], 3)).toEqual([0, 500, 1000, 1500])
    expect(ticksOf([0, 1500], 8)).toEqual(multiplesOf(200, 0, 7))
    expect(ticksOf([0, 0.5], 5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
    expect(ticksOf([0, 0.00003], 3)).toEqual([0, 0.00001, 0.00002, 0.00003])
  })

  it('steps over whole hours, days and weeks', () => {
    expect(ticksOf([0, 5 * HOUR], 5)).toEqual(multiplesOf(HOUR, 0, 5))
    expect(ticksOf([0, 3 * DAY], 3)).toEqual(multiplesOf(DAY, 0, 3))
    expect(ticksOf([0, 30 * DAY], 6)).toEqual(multiplesOf(5 * DAY, 0, 6))
    expect(ticksOf([0, 365 * DAY], 5)).toEqual(multiplesOf(10 * WEEK, 0, 5))
    expect(ticksOf([0, 40000 * WEEK], 2)).toEqual(multiplesOf(20000 * WEEK, 0, 2))
  })

  it('takes days up to 20 before weeks, starting them at 5 weeks', () => {
    expect(ticksOf([0, 20 * DAY], 1)).toEqual([0, 20 * DAY])
    expect(ticksOf([0, 20 * DAY], 2)).toEqual([0, 10 * DAY, 20 * DAY])
    expect(ticksOf([0, 20 * DAY], 3)).toEqual(multiplesOf(5 * DAY, 0, 4))
    expect(ticksOf([0, 90 * DAY], 2)).toEqual([0, 5 * WEEK, 10 * WEEK])
  })

  it('goes on with 1, 2 and 5 × 10^k of the largest allowed unit', () => {
    expect(ticksOf([0, 365 * DAY], 4, DurationUnit.Day)).toEqual(multiplesOf(100 * DAY, 0, 3))
    expect(ticksOf([0, 3e6 * DAY], 6, DurationUnit.Day)).toEqual(multiplesOf(5e5 * DAY, 0, 6))
    expect(ticksOf([0, 5 * HOUR], 5, DurationUnit.Minute)).toEqual(multiplesOf(50 * MINUTE, 0, 6))
    expect(ticksOf([0, 300 * SECOND], 5, DurationUnit.Second)).toEqual(multiplesOf(50 * SECOND, 0, 6))
    expect(ticksOf([0, 5 * HOUR], 5, DurationUnit.Millisecond)).toEqual(scaleLinear().domain([0, 5 * HOUR]).ticks(5))
  })

  it('counts the ticks from zero on a domain crossing it', () => {
    expect(ticksOf([-2 * MINUTE, 5 * MINUTE], 6)).toEqual(multiplesOf(MINUTE, -2, 5))
    expect(ticksOf([-90 * SECOND, 90 * SECOND], 6)).toEqual(multiplesOf(30 * SECOND, -3, 3))
  })

  it('handles reversed, empty and tick-less domains', () => {
    expect(ticksOf([5 * MINUTE, 0], 5)).toEqual(multiplesOf(MINUTE, 0, 5).reverse())
    expect(ticksOf([MINUTE, MINUTE], 5)).toEqual([MINUTE])
    expect(ticksOf([61 * SECOND, 119 * SECOND], 1)).toEqual([90 * SECOND])
  })

  it('extends the domain to whole units with nice', () => {
    expect(scaleDuration().domain([7 * SECOND, 283 * SECOND]).nice(5).domain()).toEqual([0, 300 * SECOND])
    expect(scaleDuration().domain([283 * SECOND, 7 * SECOND]).nice(5).domain()).toEqual([300 * SECOND, 0])
    expect(scaleDuration().domain([30, 970]).nice(5).domain()).toEqual([0, 1000])
  })

  it('keeps the duration ticks and the largest unit on copies', () => {
    const scale = scaleDuration().domain([0, 300 * SECOND]).range([0, 100])
    expect(scale.copy().copy().ticks(5)).toEqual(multiplesOf(MINUTE, 0, 5))
    expect(scale.maxUnit()).toBe(DurationUnit.Week)
    expect(scale.maxUnit(DurationUnit.Day).copy().maxUnit()).toBe(DurationUnit.Day)
  })
})
