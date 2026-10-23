// !!! This code was automatically generated. You should not change it !!!
import { Component, AfterViewInit, Input, SimpleChanges } from '@angular/core'
import {
  Brush,
  BrushConfigInterface,
  ContainerCore,
  VisEventType,
  VisEventCallback,
  NumericAccessor,
  ColorAccessor,
  ContinuousScale,
  Arrangement,
} from '@unovis/ts'
import { D3BrushEvent } from 'd3-brush'
import { VisXYComponent } from '../../core'

@Component({
  selector: 'vis-brush',
  template: '',
  // eslint-disable-next-line no-use-before-define
  providers: [{ provide: VisXYComponent, useExisting: VisBrushComponent }],
  standalone: false,
})
export class VisBrushComponent<Datum> implements BrushConfigInterface<Datum>, AfterViewInit {
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

  /** Callback function to be called on any Brush event.
   * Default: `(selection: [number, number], event: D3BrushEvent<Datum>, userDriven: boolean): void => {}` */
  @Input() onBrush?: ((selection: [number, number] | undefined, event: D3BrushEvent<Datum>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush start event.
   * Default: `(selection: [number, number], event: D3BrushEvent<Datum>, userDriven: boolean): void => {}` */
  @Input() onBrushStart?: ((selection: [number, number] | undefined, event: D3BrushEvent<Datum>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush move event.
   * Default: `(selection: [number, number], event: D3BrushEvent<Datum>, userDriven: boolean): void => {}` */
  @Input() onBrushMove?: ((selection: [number, number] | undefined, event: D3BrushEvent<Datum>, userDriven: boolean) => void)

  /** Callback function to be called on the Brush end event.
   * Default: `(selection: [number, number], event: D3BrushEvent<Datum>, userDriven: boolean): void => {}` */
  @Input() onBrushEnd?: ((selection: [number, number] | undefined, event: D3BrushEvent<Datum>, userDriven: boolean) => void)

  /** Width of the Brush handle. Default: `1` */
  @Input() handleWidth?: number

  /** Brush selection in the data space coordinates, can be used to control the selection. Default: `undefined` */
  @Input() selection?: [number, number] | null

  /** Allow dragging the selected area as a whole in order to change the selected range. Default: `false` */
  @Input() draggable?: boolean

  /** Position of the handle: `Arrangement.Inside` or `Arrangement.Outside`. Default: `Arrangement.Inside` */
  @Input() handlePosition?: Arrangement.Inside | Arrangement.Outside | string

  /** Constraint Brush selection to a minimal length in data units. Default: `undefined` */
  @Input() selectionMinLength?: number

  /** Extend the brush height by the specified number of pixels. This can be convenient when you have thick lines
   * at the bottom of the chart and you want to ensure they stay fully covered by the brush. Default: `0` */
  @Input() brushHeightExtend?: number
  @Input() data: Datum[]

  component: Brush<Datum> | undefined
  public componentContainer: ContainerCore | undefined

  ngAfterViewInit (): void {
    this.component = new Brush<Datum>(this.getConfig())

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

  private getConfig (): BrushConfigInterface<Datum> {
    const { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, onBrush, onBrushStart, onBrushMove, onBrushEnd, handleWidth, selection, draggable, handlePosition, selectionMinLength, brushHeightExtend } = this
    const config = { duration, events, attributes, x, y, id, color, colorKeys, xScale, yScale, excludeFromDomainCalculation, excludeFromCrosshair, xScaleKey, yScaleKey, onBrush, onBrushStart, onBrushMove, onBrushEnd, handleWidth, selection, draggable, handlePosition, selectionMinLength, brushHeightExtend }
    const keys = Object.keys(config) as (keyof BrushConfigInterface<Datum>)[]
    keys.forEach(key => { if (config[key] === undefined) delete config[key] })

    return config
  }
}
