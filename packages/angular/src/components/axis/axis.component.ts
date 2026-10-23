// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  Axis,
  AxisConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  ColorAccessor,
  ContinuousScale,
  Position,
  AxisType,
  FitMode,
  TrimMode,
  TextAlign,
} from '@unovis/ts'
import { VisXYComponent } from '../../core'

@Component({
  selector: 'vis-axis',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisXYComponent, useExisting: VisAxisComponent }],
  standalone: false,
})
export class VisAxisComponent<Datum> implements AxisConfigInterface<Datum>, AfterViewInit {
  /** Animation duration of the data update transitions in milliseconds. Default: `600` */
  @Input() duration?: number

  /** Events configuration. An object containing properties in the following format:
   *
   * ```
   * {
   * \[selectorString]: {
   *     \[eventType]: callbackFunction
   *  }
   * }
   * ```
   * e.g.:
   * ```
   * {
   * \[Area.selectors.area]: {
   *    click: (d) => console.log("Clicked Area", d)
   *  }
   * }
   * ``` */
  @Input() events?: {
    [selector: string]: {
      [eventType in VisEventType]?: VisEventCallback
    };
  }

  /** You can set every SVG and HTML visualization object to have a custom DOM attributes, which is useful
   * when you want to do unit or end-to-end testing. Attributes configuration object has the following structure:
   *
   * ```
   * {
   * \[selectorString]: {
   *     \[attributeName]: attribute constant value or accessor function
   *  }
   * }
   * ```
   * e.g.:
   * ```
   * {
   * \[Area.selectors.area]: {
   *    "test-value": d => d.value
   *  }
   * }
   * ``` */
  @Input() attributes?: {
    [selector: string]: {
      [attr: string]: string | number | boolean | ((datum: any) => string | number | boolean);
    };
  }

  /** Accessor function for getting the values along the X axis. Default: `undefined` */
  @Input() x?: NumericAccessor<Datum>

  /** A single of multiple accessor functions for getting the values along the Y axis. Default: `undefined` */
  @Input() y?: NumericAccessor<Datum> | NumericAccessor<Datum>[]

  /** Accessor function for getting the unique data record id. Used for more persistent data updates. Default: `(d, i) => d.id ?? i` */
  @Input() id?: ((d: Datum, i: number, ...rest) => string)

  /** Component color accessor function. Default: `d => d.color` */
  @Input() color?: ColorAccessor<Datum> | ColorAccessor<Datum[]>

  /** Array of data color keys. Use to map data keys to colors.
   * Expected to the same length as the `y` accessors array.
   * Default: `undefined` */
  @Input() colorKeys?: string[]

  /** Scale for X dimension, e.g. Scale.scaleLinear(). If you set xScale you'll be responsible for setting it's `domain` and `range` as well.
   * Only continuous scales are supported.
   * Default: `undefined` */
  @Input() xScale?: ContinuousScale

  /** Scale for Y dimension, e.g. Scale.scaleLinear(). If you set yScale you'll be responsible for setting it's `domain` and `range` as well.
   * Only continuous scales are supported.
   * Default: `undefined` */
  @Input() yScale?: ContinuousScale

  /** Identifies whether the component should be excluded from overall X and Y domain calculations or not.
   * This property can be useful when you want pass individual data to a component and you don't want it to affect
   * the scales of the chart.
   * Default: `false` */
  @Input() excludeFromDomainCalculation?: boolean

  /** Excludes the component from the Crosshair: no circles get rendered for its `y` accessors. The Crosshair can still
   * take its `x` accessor from the component (see `xScaleKey`), so excluding all the components leaves the Crosshair
   * line and tooltip working. Default: `false` */
  @Input() excludeFromCrosshair?: boolean

  /** Key of the container's named X scale the component is bound to (see `xScales` in the XY Container config).
   * Components bound to the same key share the scale domain. The Crosshair follows a single X scale: the primary one,
   * or the one named by its own `xScaleKey`. It takes its `x` accessor from the first component bound to that scale
   * and renders circles only for the components bound to it. Default: `undefined` (the container's primary X scale) */
  @Input() xScaleKey?: string

  /** Key of the container's named Y scale the component is bound to (see `yScales` in the XY Container config).
   * Components bound to the same key share the scale domain. Default: `undefined` (the container's primary Y scale) */
  @Input() yScaleKey?: string

  /** Axis position: `Position.Top`, `Position.Bottom`, `Position.Right` or `Position.Left`. Default: `undefined` */
  @Input() position?: Position | `${Position}`

  /** Axis type: `AxisType.X` or `AxisType.Y` */
  @Input() type?: AxisType | `${AxisType}`

  /** Extend the axis domain line to be full width or full height. Default: `true` */
  @Input() fullSize?: boolean

  /** Axis label. Default: `undefined` */
  @Input() label?: string

  /** Font size of the axis label as CSS string. Default: `null` */
  @Input() labelFontSize?: string | null

  /** Distance between the axis and the label in pixels. Default: `8` */
  @Input() labelMargin?: number

  /** Label text fit mode: `FitMode.Wrap` or `FitMode.Trim`. Default: `FitMode.Wrap`. */
  @Input() labelTextFitMode?: FitMode | `${FitMode}`

  /** Label text trim mode: `TrimMode.Start`, `TrimMode.Middle` or `TrimMode.End`. Default: `TrimMode.Middle` */
  @Input() labelTextTrimType?: TrimMode | `${TrimMode}`

  /** Label text wrapping separator. String or array of strings. Default: `undefined` */
  @Input() labelTextSeparator?: string | string[]

  /** Font color of the axis label as CSS string. Default: `null` */
  @Input() labelColor?: string | null

  /** Sets whether to draw the grid lines or not. Default: `true` */
  @Input() gridLine?: boolean

  /** Sets whether to draw the tick lines or not. Default: `true` */
  @Input() tickLine?: boolean

  /** Sets whether to draw the domain line or not. Default: `true` */
  @Input() domainLine?: boolean

  /** Draw only the min and max axis ticks. Default: `false` */
  @Input() minMaxTicksOnly?: boolean

  /** Show grid lines for the min and max axis ticks. Default: `false` */
  @Input() minMaxTicksOnlyShowGridLines?: boolean

  /** Draw only the min and max axis ticks, when the chart width is less than the specified value.
   * Has no effect when `tickTextAdaptiveSets` is enabled.
   * Default: `250` */
  @Input() minMaxTicksOnlyWhenWidthIsLess?: number

  /** Tick label formatter function. Default: `undefined` */
  @Input() tickFormat?: ((tick: number | Date, i: number, ticks: number[] | Date[]) => string)

  /** Explicitly set tick values. Default: `undefined` */
  @Input() tickValues?: number[]

  /** Set the approximate number of axis ticks (will be passed to D3's axis constructor). Default: `undefined` */
  @Input() numTicks?: number

  /** Approximate spacing between ticks in pixels, used to derive the number of ticks
   * when `numTicks` is not set. Only applies to the X axis. Default: `175` */
  @Input() tickSpacing?: number

  /** Tick text fit mode: `FitMode.Wrap` or `FitMode.Trim`. Default: `FitMode.Wrap`. */
  @Input() tickTextFitMode?: FitMode | `${FitMode}`

  /** Maximum width in pixels for the tick text to be wrapped or trimmed. Default: `undefined` */
  @Input() tickTextWidth?: number

  /** Tick text wrapping separator. String or array of strings. Default: `undefined` */
  @Input() tickTextSeparator?: string | string[]

  /** Force word break for ticks when they don't fit. Default: `false` */
  @Input() tickTextForceWordBreak?: boolean

  /** Tick text trim mode: `TrimMode.Start`, `TrimMode.Middle` or `TrimMode.End`. Default: `TrimMode.Middle` */
  @Input() tickTextTrimType?: TrimMode | `${TrimMode}`

  /** Font size of the tick text as CSS string. Default: `null` */
  @Input() tickTextFontSize?: string | null

  /** Text alignment for ticks: `TextAlign.Left`, `TextAlign.Center` or `TextAlign.Right`. Default: `undefined` */
  @Input() tickTextAlign?: TextAlign | `${TextAlign}` | ((tickValue: number | Date, tickIndex: number, tickValues: number[] | Date[], tickPosition: [number, number], componentWidth: number, componentHeight: number) => TextAlign | `${TextAlign}`)

  /** Font color of the tick text as CSS string. Default: `null` */
  @Input() tickTextColor?: string | null

  /** Text rotation angle for ticks. Default: `undefined` */
  @Input() tickTextAngle?: number

  /** Adaptively pick the number of ticks so that their labels don't overlap: the axis renders the
   * largest "nice" tick set that fits (measured off-screen), degrading to smaller sets on narrow
   * charts. `numTicks` (or its width-based default) acts as the upper bound. With explicit
   * `tickValues`, every-k-th subsets of them are fitted instead.
   * Has no effect when `minMaxTicksOnly` is set, and disables the width-based
   * `minMaxTicksOnlyWhenWidthIsLess` fallback. Default: `undefined` */
  @Input() tickTextAdaptiveSets?: boolean

  /** Hide tick labels that overlap with each other.
   * To define overlapping, a simple bounding box collision detection algorithm is used.
   * Which means the result won't be accurate when `tickTextAngle` is specified.
   * Consider combining with `tickTextAdaptiveSets` to keep the shown ticks evenly spaced.
   * Default: `undefined` */
  @Input() tickTextHideOverlapping?: boolean

  /** The spacing in pixels between the tick and it's label. Default: `8` */
  @Input() tickPadding?: number

  /** The size of the tick marks in pixels. Accepts a single number (applies to both inner and outer ticks)
   * or a tuple `[innerTickSize, outerTickSize]`. Default: `6` */
  @Input() tickSize?: number | [number, number]
  @Input() data: Datum[]

  component: Axis<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new Axis<Datum>(this.getConfig())

    if (this.data !== undefined) {
      this.component.setData(this.data)
      this.componentContainer?.render()
    }
  }

  ngOnChanges (changes: SimpleChanges): void {
    if (changes.data && this.data !== undefined) { this.component?.setData(this.data) }
    this.component?.setConfig(this.getConfig())
    this.componentContainer?.render()
  }

  private getConfig (): AxisConfigInterface<Datum> {
    const { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, position, type, fullSize, label, labelFontSize, labelMargin, labelTextFitMode, labelTextTrimType, labelTextSeparator, labelColor, gridLine, tickLine, domainLine, minMaxTicksOnly, minMaxTicksOnlyShowGridLines, minMaxTicksOnlyWhenWidthIsLess, tickFormat, tickValues, numTicks, tickSpacing, tickTextFitMode, tickTextWidth, tickTextSeparator, tickTextForceWordBreak, tickTextTrimType, tickTextFontSize, tickTextAlign, tickTextColor, tickTextAngle, tickTextAdaptiveSets, tickTextHideOverlapping, tickPadding, tickSize } = this
    const config = { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, position, type, fullSize, label, labelFontSize, labelMargin, labelTextFitMode, labelTextTrimType, labelTextSeparator, labelColor, gridLine, tickLine, domainLine, minMaxTicksOnly, minMaxTicksOnlyShowGridLines, minMaxTicksOnlyWhenWidthIsLess, tickFormat, tickValues, numTicks, tickSpacing, tickTextFitMode, tickTextWidth, tickTextSeparator, tickTextForceWordBreak, tickTextTrimType, tickTextFontSize, tickTextAlign, tickTextColor, tickTextAngle, tickTextAdaptiveSets, tickTextHideOverlapping, tickPadding, tickSize }
    const keys = Object.keys(config) as (keyof AxisConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
