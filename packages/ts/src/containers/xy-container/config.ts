// Core
import { XYComponentCore } from '@/core/xy-component'
import { ContainerDefaultConfig, ContainerConfigInterface } from '@/core/container/config'

// Components
import { Annotations } from '@/components/annotations'
import { Tooltip } from '@/components/tooltip'
import { Axis } from '@/components/axis'
import { Crosshair } from '@/components/crosshair'

// Types
import { ContinuousScale } from '@/types/scale'
import { Direction } from '@/types/direction'
import { Spacing } from '@/types/spacing'

/** Configuration of a named scale, see `xScales` and `yScales` of the XY Container config */
export interface XYContainerScaleConfigInterface {
  /** Scale instance, e.g. Scale.scaleLinear(). If set, the components bound to the scale share this single instance.
   * By default they have their own scale instances but their `domain` and `range` values are synchronized.
   * Don't configure one instance for several scales: they would overwrite each other's domain and range.
   * Default: `undefined` */
  scale?: ContinuousScale;
  /** Scale domain (data extent). By default it is calculated automatically from the data of the bound components */
  domain?: [number | undefined, number | undefined];
  /** Constraint the minimum value of the scale domain, see `xDomainMinConstraint`. Default: `undefined` */
  domainMinConstraint?: [number | undefined, number | undefined];
  /** Constraint the maximum value of the scale domain, see `xDomainMaxConstraint`. Default: `undefined` */
  domainMaxConstraint?: [number | undefined, number | undefined];
  /** The part of the chart the scale is mapped to, as fractions `[start, end]` along its range: `0` is where the
   * domain starts (the left of the chart for an X scale, the bottom for a Y scale or the top with `yDirection: south`)
   * and `1` where it ends. E.g. `[0, 0.2]` maps a Y scale onto the bottom 20% of the chart (with the default `yDirection`),
   * which is how you get a volume pane under a price chart. The axes bound to the scale span only its segment.
   * The primary scales' `xRangeSegment` / `yRangeSegment` don't apply here. Default: `undefined` (the whole chart) */
  rangeSegment?: [number, number];
}

export interface XYContainerConfigInterface<Datum> extends ContainerConfigInterface {
  /** An array of visualization components. Default: `[]` */
  components?: XYComponentCore<Datum>[];

  /** Scale for X dimension, e.g. Scale.scaleLinear().
   * If set, this value will override the xScale of the components without an `xScaleKey` and they will have a single shared xScale instance.
   * By default the components have their own scale instances but their `domain` and `range` values are synchronized.
   * Default: `undefined` */
  xScale?: ContinuousScale;
  /** Scale domain (data extent) for X dimension. By default this value is calculated automatically based on data. */
  xDomain?: [number | undefined, number | undefined];
  /** Constraint the minimum value of the X scale domain. Useful when the data is plotted along the X axis.
   * For example, imagine that you have a chart with dynamic data that has negative values. When values are small
   * (let's say in the range of [-0.01, 0]), you might still want the chart to display some meaningful value range (e.g. [-1, 0]). That can
   * be achieved by setting `xDomainMinConstraint` to `[undefined, -1]`. In addition to that, if you want to cut off the
   * values that are too low (let's say lower than -100), you can set the constraint to `[-100, -1]`
   * Default: `undefined` */
  xDomainMinConstraint?: [number | undefined, number | undefined];
  /** Constraint the minimum value of the X scale domain. Useful when the data is plotted along the X axis.
   * For example, imagine that you have a chart with dynamic data. When values are small
   * (let's say < 0.01), you might still want the chart to display some meaningful value range (e.g. [0, 1]). That can
   * be achieved by setting `xDomainMaxConstraint` to `[1, undefined]`. In addition to that, if you want to cut off the
   * values that are too high (let's say higher than 100), you can set the constraint to `[1, 100]`
   * Default: `undefined` */
  xDomainMaxConstraint?: [number | undefined, number | undefined];
  /** Force set the X scale range (in the screen space). By default the range is calculated automatically based on the
   * chart's set up */
  xRange?: [number, number];
  /** The part of the chart the primary X scale is mapped to, as fractions `[start, end]` of its range,
   * see `rangeSegment` of the named scales. The named scales don't follow it. Default: `undefined` (the whole chart) */
  xRangeSegment?: [number, number];

  /** Scale for Y dimension, e.g. Scale.scaleLinear().
   * If set, this value will override the yScale of the components without a `yScaleKey` and they will have a single shared yScale instance.
   * By default the components have their own scale instances but their `domain` and `range` values are synchronized.
   * Default: `undefined` */
  yScale?: ContinuousScale;
  /** Scale domain (data extent) for Y dimension. By default this value is calculated automatically based on data. */
  yDomain?: [number | undefined, number | undefined];
  /** Constraint the minimum value of the Y scale domain.
   * For example, imagine that you have a chart with dynamic data that has negative values. When values are small
   * (let's say in the range of [-0.01, 0]), you might still want the chart to display some meaningful value range (e.g. [-1, 0]). That can
   * be achieved by setting `yDomainMinConstraint` to `[undefined, -1]`. In addition to that, if you want to cut off the
   * values that are too low (let's say lower than -100), you can set the constraint to `[-100, -1]`
   * Default: `undefined` */
  yDomainMinConstraint?: [number | undefined, number | undefined];
  /** Constraint the minimum value of the Y scale domain.
   * For example, imagine that you have a chart with dynamic data. When values are small
   * (let's say < 0.01), you might still want the chart to display some meaningful value range (e.g. [0, 1]). That can
   * be achieved by setting `yDomainMaxConstraint` to `[1, undefined]`. In addition to that, if you want to cut off the
   * values that are too high (let's say higher than 100), you can set the constraint to `[1, 100]`
   * Default: `undefined` */
  yDomainMaxConstraint?: [number | undefined, number | undefined];
  /** Force set the Y scale range (in the screen space). By default the range is calculated automatically based on the
   * chart's set up */
  yRange?: [number, number];
  /** The part of the chart the primary Y scale is mapped to, as fractions `[start, end]` of its range,
   * see `rangeSegment` of the named scales. E.g. `[0.25, 1]` leaves the bottom quarter of the chart (the top one with
   * `yDirection: south`) to other scales. The named scales don't follow it. Default: `undefined` (the whole chart) */
  yRangeSegment?: [number, number];
  /** Y Axis direction. Default: `Direction.North` */
  yDirection?: Direction.South | Direction.North | string;

  /** Named X scales in addition to the primary one, keyed by the `xScaleKey` the components and axes use to bind
   * to them. The components bound to one key get a common domain, calculated from their data unless the `domain`
   * is set here. Each of them spans the whole chart unless its `rangeSegment` is set. The settings of the primary scale
   * (`xScale`, `xDomain` and its constraints, `xRangeSegment`) don't apply to them. A key doesn't have to be listed
   * here to be used, the entries only configure the scales. Default: `undefined` */
  xScales?: Record<string, XYContainerScaleConfigInterface>;
  /** Named Y scales in addition to the primary one, keyed by the `yScaleKey` the components and axes use to bind
   * to them. The components bound to one key get a common domain, calculated from their data unless the `domain`
   * is set here. Each of them spans the whole chart unless its `rangeSegment` is set. The settings of the primary scale
   * (`yScale`, `yDomain` and its constraints, `yRangeSegment`) don't apply to them. A key doesn't have to be listed
   * here to be used, the entries only configure the scales. Default: `undefined` */
  yScales?: Record<string, XYContainerScaleConfigInterface>;

  /** X Axis component instance, or an array of them. Axes sharing a side of the chart are stacked outwards
   * in the order provided. Each axis can be bound to a named scale with its `xScaleKey`. Default: `undefined` */
  xAxis?: Axis<Datum> | Axis<Datum>[];
  /** Y Axis component instance, or an array of them. Axes sharing a side of the chart are stacked outwards
   * in the order provided. Each axis can be bound to a named scale with its `yScaleKey`. Default: `undefined` */
  yAxis?: Axis<Datum> | Axis<Datum>[];
  /** Enables automatic calculation of chart margins based on the size of the axes. Default: `true` */
  autoMargin?: boolean;
  /** Tooltip component. Created automatically when the crosshair has a custom template and no tooltip is provided. Default: `undefined` */
  tooltip?: Tooltip | undefined;
  /** Crosshair component. Default: `undefined` */
  crosshair?: Crosshair<Datum> | undefined;
  /** Prevents the chart domain from being empty (when domain's min and max values are equal).
   *  That usually happens when all the data values are equal or when there's no data.
   *  Setting to `true` will automatically extend the domain by `+1` when the domain is empty (domain start equals domain end).
   *  Setting to `null` will extend the empty X domain, but only when there's no data.
   *  Setting to `false` will keep the domain as is.
   *  Default: `null` */
  preventEmptyDomain?: boolean | null;
  /** Sets the Y scale domain based on the current X scale domain (not the whole dataset). Default: `false` */
  scaleByDomain?: boolean;
  /** Annotations component. Default: `undefined` */
  annotations?: Annotations | undefined;
  /** Extend the clip path by the specified number of pixels. Default: `2` */
  clipPathExtend?: number;
  /** Override the automatically calculated bleed — the extra space (in pixels) the components request
   * to fully fit into the container (e.g. half of the point diameter for Scatter), which gets subtracted
   * from the scale ranges. Accepts a `Spacing` object or a function that receives the container's
   * components (their individual bleed values are available via the `bleed` getter) and returns one.
   * The sides you provide replace the calculated values, the sides left `undefined` fall back to them —
   * pass `0` explicitly to remove the bleed on a side.
   * Useful for synchronizing the scale ranges of multiple charts, since the final bleed is provided
   * to the `onRenderComplete` callback. Default: `undefined` */
  bleed?: Spacing | ((components: XYComponentCore<Datum>[]) => Spacing);
  /** Callback function to be called when the chart rendering is complete. Default: `undefined` */
  onRenderComplete?: (
    svgNode: SVGSVGElement,
    margin: Spacing,
    bleed: Spacing,
    containerWidth: number,
    containerHeight: number,
    componentWidth: number,
    componentHeight: number,
  ) => void;
}


export const XYContainerDefaultConfig: XYContainerConfigInterface<unknown> = {
  ...ContainerDefaultConfig,
  components: [],
  tooltip: undefined,
  crosshair: undefined,
  annotations: undefined,
  xAxis: undefined,
  yAxis: undefined,
  autoMargin: true,

  xScale: undefined,
  xDomain: undefined,
  xDomainMinConstraint: undefined,
  xDomainMaxConstraint: undefined,
  xRange: undefined,
  xRangeSegment: undefined,

  yScale: undefined,
  yDomain: undefined,
  yDomainMinConstraint: undefined,
  yDomainMaxConstraint: undefined,
  yRange: undefined,
  yRangeSegment: undefined,
  yDirection: Direction.North,

  xScales: undefined,
  yScales: undefined,

  preventEmptyDomain: null,
  scaleByDomain: false,

  clipPathExtend: 2,
  bleed: undefined,
}

