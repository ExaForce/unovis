import { NumericAccessor } from '@/types/accessor'

export type CrosshairCircle = {
  y: number;
  color: string;
  opacity?: number;
  id?: string;
  strokeColor?: string;
  strokeWidth?: number;
  /** Size of the segment the circle belongs to. Among overlapping circles, the largest one is painted last */
  magnitude?: number;
}

/** A group of the `yStacked` accessors whose values accumulate together, see `Crosshair.stacks` */
export type CrosshairStack<Datum> = {
  /** Indices of the accessors in the `yStacked` array, in the stacking order */
  indices: number[];
  /** Accessor of the value the stack starts from */
  baseline?: NumericAccessor<Datum>;
}

export type CrosshairAccessors<Datum> = {
  x: NumericAccessor<Datum> | undefined;
  y: NumericAccessor<Datum>[] | undefined;
  yStacked: NumericAccessor<Datum>[] | undefined;
  baseline: NumericAccessor<Datum> | undefined;
}
