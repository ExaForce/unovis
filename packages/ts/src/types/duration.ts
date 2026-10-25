import { ScaleLinear } from 'd3-scale'

export enum DurationUnit {
  Millisecond = 'millisecond',
  Second = 'second',
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
}

export interface ScaleDuration extends ScaleLinear<number, number> {
  /** The largest unit of the tick steps, `DurationUnit.Week` by default. Past its own multiples,
   * its steps go on with 1, 2 and 5 × 10^k: 50d, 100d, 200d… for `DurationUnit.Day` */
  maxUnit (): DurationUnit;
  maxUnit (unit: DurationUnit): this;
}
