import { NumericAccessor } from '@/types/accessor'
import { XYComponentPointOffset } from '@/core/xy-component/types'

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

export type CrosshairPointOffset = (index: number, circleIndex: number) => XYComponentPointOffset | undefined
