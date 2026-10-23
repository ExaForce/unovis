// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  Plotline,
  PlotlineConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  ContinuousScale,
  AxisType,
  PlotlineLineStylePresets,
  UnovisText,
  PlotlineLabelPosition,
  PlotlineLabelOrientation,
} from '@unovis/ts'
import { VisXYComponent } from '../../core'

@Component({
  selector: 'vis-plotline',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisXYComponent, useExisting: VisPlotlineComponent }],
  standalone: false,
})
export class VisPlotlineComponent<Datum> implements PlotlineConfigInterface<Datum>, AfterViewInit {
  /** Duration of the animation in milliseconds. */
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

  /** Color of the plotline.
   * Uses CSS variable: `--vis-plotline-color`. */
  @Input() color?: string

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

  /** Line width in pixels.
   * Uses CSS variable: `--vis-plotline-width`. */
  @Input() lineWidth?: number

  /** Plotline direction type.
   * Should be either `AxisType.X` or `AxisType.Y`. */
  @Input() axis?: AxisType | string

  /** Value to draw the plotline at. */
  @Input() value?: number | null | undefined

  /** Line style of the plotline.
   * Can be a named preset or an array of numbers representing `stroke-dasharray`.
   * Uses CSS variable: `--vis-plotline-dasharray`. */
  @Input() lineStyle?: PlotlineLineStylePresets | number[]

  /** Label to display on the plotline.
   * Accepts a plain string (use `\n` for line breaks), or one or more `UnovisText` blocks
   * for styled multi-line labels. Font size, color and font family set on a text block
   * take priority over the `labelSize` and `labelColor` options. */
  @Input() labelText?: string | UnovisText | UnovisText[]

  /** Position of the label relative to the plotline. */
  @Input() labelPosition?: PlotlineLabelPosition

  /** Horizontal offset of the label in pixels. */
  @Input() labelOffsetX?: number

  /** Vertical offset of the label in pixels. */
  @Input() labelOffsetY?: number

  /** Orientation of the label: horizontal or vertical. */
  @Input() labelOrientation?: PlotlineLabelOrientation

  /** Color of the label text.
   * Uses CSS variable: `--vis-plotline-label-color`. */
  @Input() labelColor?: string

  /** Font size of the label text in pixels.
   * Uses CSS variable: `--vis-plotline-label-font-size`. */
  @Input() labelSize?: number

  component: Plotline<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new Plotline<Datum>(this.getConfig())
  }

  ngOnChanges (changes: SimpleChanges): void {
    this.component?.setConfig(this.getConfig())
    this.componentContainer?.render()
  }

  private getConfig (): PlotlineConfigInterface<Datum> {
    const { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, lineWidth, axis, value, lineStyle, labelText, labelPosition, labelOffsetX, labelOffsetY, labelOrientation, labelColor, labelSize } = this
    const config = { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, lineWidth, axis, value, lineStyle, labelText, labelPosition, labelOffsetX, labelOffsetY, labelOrientation, labelColor, labelSize }
    const keys = Object.keys(config) as (keyof PlotlineConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
