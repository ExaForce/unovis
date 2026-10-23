import { ContinuousScale } from '@/types/scale'

// Types
import { ColorAccessor, NumericAccessor } from '@/types/accessor'

// Config
import { ComponentDefaultConfig, ComponentConfigInterface } from '../component/config'

export interface XYComponentConfigInterface<Datum> extends ComponentConfigInterface {
  /** Accessor function for getting the values along the X axis. Default: `undefined` */
  x: NumericAccessor<Datum>;
  /** A single of multiple accessor functions for getting the values along the Y axis. Default: `undefined` */
  y: NumericAccessor<Datum> | NumericAccessor<Datum>[];
  /** Accessor function for getting the unique data record id. Used for more persistent data updates. Default: `(d, i) => d.id ?? i` */
  id?: ((d: Datum, i: number, ...any: any[]) => string);
  /** Component color accessor function. Default: `d => d.color` */
  color?: ColorAccessor<Datum> | ColorAccessor<Datum[]>;
  /** Array of data color keys. Use to map data keys to colors.
   * Expected to the same length as the `y` accessors array.
   * Default: `undefined` */
  colorKeys?: string[];
  /** Scale for X dimension, e.g. Scale.scaleLinear(). If you set xScale you'll be responsible for setting it's `domain` and `range` as well.
   * Only continuous scales are supported.
   * Default: `undefined`
  */
  xScale?: ContinuousScale;
  /** Scale for Y dimension, e.g. Scale.scaleLinear(). If you set yScale you'll be responsible for setting it's `domain` and `range` as well.
   * Only continuous scales are supported.
   * Default: `undefined`
  */
  yScale?: ContinuousScale;
  /** Identifies whether the component should be excluded from overall X and Y domain calculations or not.
   * This property can be useful when you want pass individual data to a component and you don't want it to affect
   * the scales of the chart.
   * Default: `false`
  */
  excludeFromDomainCalculation?: boolean;
  /** Excludes the component from the Crosshair: no circles get rendered for its `y` accessors. The Crosshair can still
   * take its `x` accessor from the component (see `xScaleKey`), so excluding all the components leaves the Crosshair
   * line and tooltip working. Default: `false` */
  excludeFromCrosshair?: boolean;
  /** Key of the container's named X scale the component is bound to (see `xScales` in the XY Container config).
   * Components bound to the same key share the scale domain. The Crosshair follows a single X scale: the primary one,
   * or the one named by its own `xScaleKey`. It takes its `x` accessor from the first component bound to that scale
   * and renders circles only for the components bound to it. Default: `undefined` (the container's primary X scale) */
  xScaleKey?: string;
  /** Key of the container's named Y scale the component is bound to (see `yScales` in the XY Container config).
   * Components bound to the same key share the scale domain. Default: `undefined` (the container's primary Y scale) */
  yScaleKey?: string;
}

export const XYComponentDefaultConfig: XYComponentConfigInterface<unknown> = {
  ...ComponentDefaultConfig,
  x: undefined,
  y: undefined,
  id: (d: unknown, i: number): string => (d as { id: string }).id ?? `${i}`,
  color: (d: unknown | unknown[]): string => (d as { color: string }).color,
  xScale: undefined,
  yScale: undefined,
  excludeFromDomainCalculation: false,
  excludeFromCrosshair: false,
  xScaleKey: undefined,
  yScaleKey: undefined,
}
