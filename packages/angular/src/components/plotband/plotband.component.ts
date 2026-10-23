// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  Plotband,
  PlotbandConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  ContinuousScale,
  AxisType,
  UnovisText,
  PlotbandLabelPosition,
  PlotbandLabelOrientation,
} from '@unovis/ts'
import { VisXYComponent } from '../../core'

@Component({
  selector: 'vis-plotband',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisXYComponent, useExisting: VisPlotbandComponent }],
  standalone: false,
})
export class VisPlotbandComponent<Datum> implements PlotbandConfigInterface<Datum>, AfterViewInit {
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

  /** Fill color of the plotband.
   * Accepts any valid CSS color string. */
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

  /** Axis to draw the plotband on. */
  @Input() axis?: AxisType

  /** Start coordinate for the plotband. */
  @Input() from?: number | null | undefined

  /** End coordinate for the plotband. */
  @Input() to?: number | null | undefined

  /** Label to display on the plotband.
   * Accepts a plain string (use `\n` for line breaks), or one or more `UnovisText` blocks
   * for styled multi-line labels. Font size, color and font family set on a text block
   * take priority over the `labelSize` and `labelColor` options. */
  @Input() labelText?: string | UnovisText | UnovisText[]

  /** Position of the label relative to the plotband area (e.g., 'top-left-outside').
   * Can be customized with a string. */
  @Input() labelPosition?: PlotbandLabelPosition

  /** Horizontal offset (in pixels) for positioning the label. */
  @Input() labelOffsetX?: number

  /** Vertical offset (in pixels) for positioning the label. */
  @Input() labelOffsetY?: number

  /** Orientation of the label text. */
  @Input() labelOrientation?: PlotbandLabelOrientation

  /** Optional color for the label text */
  @Input() labelColor?: string

  /** Font size (in pixels) for the label text.
   * Uses the CSS variable `--vis-plotband-label-font-size` by default, which resolves to `12px`. */
  @Input() labelSize?: number

  component: Plotband<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new Plotband<Datum>(this.getConfig())
  }

  ngOnChanges (changes: SimpleChanges): void {
    this.component?.setConfig(this.getConfig())
    this.componentContainer?.render()
  }

  private getConfig (): PlotbandConfigInterface<Datum> {
    const { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, axis, from, to, labelText, labelPosition, labelOffsetX, labelOffsetY, labelOrientation, labelColor, labelSize } = this
    const config = { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, axis, from, to, labelText, labelPosition, labelOffsetX, labelOffsetY, labelOrientation, labelColor, labelSize }
    const keys = Object.keys(config) as (keyof PlotbandConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
