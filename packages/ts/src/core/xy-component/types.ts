/** Where a component draws a point, in pixels from the position of the point's values */
export type XYComponentPointOffset = {
  /** Where the point is drawn: _Crosshair_ puts its circle there */
  drawn: [number, number];
  /** The segment the point answers for: _Crosshair_ snaps to the point whose segment is the closest to the pointer.
   * A grouped bar answers for its whole column, a stacked segment for its part of the column and the outermost segments
   * for the rest of it, so that the pointer anywhere in a column picks it. Default: the drawn point */
  hit?: [[number, number], [number, number]];
  /** Where the point belongs, e.g. a grouped bar's place in its group: _Crosshair_ draws its lines through it */
  slot: [number, number];
}
