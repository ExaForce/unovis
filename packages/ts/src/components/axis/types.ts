export enum AxisType {
  X = 'x',
  Y = 'y',
}

export type TickValues = (number | Date)[]

/** Result of the adaptive tick fitting */
export type TickSets = {
  /** The largest set whose labels don't overlap — its ticks get labeled */
  fitted: TickValues;
  /** The full (unfitted) tick set — its remaining ticks render as unlabeled marks.
   * Kept step-nested so the fitted sets are its subsets, see `getNestedTickValues` */
  original: TickValues;
}
