import { NumericAccessor } from '@/types/accessor'

export type CrosshairCircle = {
  y: number;
  color: string;
  opacity?: number;
  id?: string;
  strokeColor?: string;
  strokeWidth?: number;
  offset?: [number, number];
}

export type CrosshairAccessors<Datum> = {
  x: NumericAccessor<Datum> | undefined;
  y: NumericAccessor<Datum>[] | undefined;
  yStacked: NumericAccessor<Datum>[] | undefined;
  baseline: NumericAccessor<Datum> | undefined;
}

/** Where a component draws the point of a datum for _Crosshair_, in pixels from the position of the point's values */
export type CrosshairPointOffset = {
  /** Where _Crosshair_ puts its circle */
  circle: [number, number];
  /** What the _Crosshair_ lines go through, e.g. a grouped bar's place in its group, or a spread Scatter point's value */
  lines: [number, number];
  /** The segment _Crosshair_ measures the distance to when it snaps to the point closest to the pointer. A grouped bar answers
   * for its whole column, a stacked segment for its part of the column and the outermost segments for the rest of it,
   * so that the pointer anywhere in a column picks it. Default: the circle */
  snapSegment?: [[number, number], [number, number]];
}
