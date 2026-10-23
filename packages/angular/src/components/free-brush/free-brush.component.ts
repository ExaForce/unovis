// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  FreeBrush,
  FreeBrushConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  ColorAccessor,
  ContinuousScale,
  FreeBrushMode,
  FreeBrushSelection,
} from '@unovis/ts'
import { D3BrushEvent } from 'd3-brush'
import { VisXYComponent } from '../../core'

@Component({
  selector: 'vis-free-brush',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisXYComponent, useExisting: VisFreeBrushComponent }],
  standalone: false,
})
export class VisFreeBrushComponent<Datum> implements FreeBrushConfigInterface<Datum>, AfterViewInit {
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

  /** Brush selection mode. X - horizontal, Y - vertical, XY - both. Default: `FreeBrushMode.X` */
  @Input() mode?: FreeBrushMode

  /** Callback function to be called on any Brush event.
   * Default: `(selection: FreeBrushSelection, event: D3BrushEvent<Datum>, userDriven: boolean): void => {}` */
  @Input() onBrush?: ((selection: FreeBrushSelection | undefined, event: D3BrushEvent<unknown>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush start event.
   * Default: `(selection: FreeBrushSelection, event: D3BrushEvent<unknown>, userDriven: boolean): void => {}` */
  @Input() onBrushStart?: ((selection: FreeBrushSelection | undefined, event: D3BrushEvent<unknown>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush move event.
   * Default: `(selection: FreeBrushSelection, event: D3BrushEvent<unknown>, userDriven: boolean): void => {}` */
  @Input() onBrushMove?: ((selection: FreeBrushSelection | undefined, event: D3BrushEvent<unknown>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush end event.
   * Default: `(selection: FreeBrushSelection, event: D3BrushEvent<unknown>, userDriven: boolean)L void => {}` */
  @Input() onBrushEnd?: ((selection: FreeBrushSelection | undefined, event: D3BrushEvent<unknown>, userDriven: boolean) => void)

  /** Width of the Brush handle. Default: `1` */
  @Input() handleWidth?: number

  /** Brush selection in data space, can be used to force set the selection from outside.
   * In case of two dimensional mode, the selection has the following format: `[[xMin, xMax], [yMin, yMax]]`.
   * This config property gets updated on internal brush events. Default: `undefined` */
  @Input() selection?: FreeBrushSelection | null | undefined

  /** Constraint Brush selection to a minimal length in data units. Default: `undefined` */
  @Input() selectionMinLength?: number | [number, number]

  /** Automatically hide the brush after selection. Default: `true` */
  @Input() autoHide?: boolean
  @Input() data: Datum[]

  component: FreeBrush<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new FreeBrush<Datum>(this.getConfig())

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

  private getConfig (): FreeBrushConfigInterface<Datum> {
    const { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, mode, onBrush, onBrushStart, onBrushMove, onBrushEnd, handleWidth, selection, selectionMinLength, autoHide } = this
    const config = { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, mode, onBrush, onBrushStart, onBrushMove, onBrushEnd, handleWidth, selection, selectionMinLength, autoHide }
    const keys = Object.keys(config) as (keyof FreeBrushConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
