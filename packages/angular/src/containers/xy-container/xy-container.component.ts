import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  Input,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChild,
} from '@angular/core'

// Vis
import { XYContainer } from '@unovis/ts/containers/xy-container'
import { XYContainerConfigInterface } from '@unovis/ts/containers/xy-container/config'
import { Annotations } from '@unovis/ts/components/annotations'
import { Axis } from '@unovis/ts/components/axis'
import { Crosshair } from '@unovis/ts/components/crosshair'
import { Tooltip } from '@unovis/ts/components/tooltip'
import { ContinuousScale } from '@unovis/ts/types/scale'
import { Direction } from '@unovis/ts/types/direction'
import { Spacing } from '@unovis/ts/types/spacing'
import { ColorFunction } from '@unovis/ts/types/accessor'
import { XYComponentCore } from '@unovis/ts/core/xy-component'
import { VisXYComponent } from '../../core'
import { VisTooltipComponent } from '../../components/tooltip/tooltip.component'
import { VisAnnotationsComponent } from '../../components/annotations/annotations.component'

@Component({
  selector: 'vis-xy-container',
  template: `<div #container class="unovis-xy-container">
    <ng-content></ng-content>
  </div>`,
  styles: ['.unovis-xy-container { width: 100%; height: 100%; position: relative; }'],
  standalone: false,
})
export class VisXYContainerComponent<Datum> implements AfterViewInit, AfterContentInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef: ElementRef
  @ContentChildren(VisXYComponent) visComponents: QueryList<VisXYComponent>
  @ContentChild(VisTooltipComponent) tooltipComponent: VisTooltipComponent
  @ContentChild(VisAnnotationsComponent) annotationsComponent: VisAnnotationsComponent

  /** Width in pixels or in CSS units.
   * Percentage units `"%"` are not supported here. If you want to set `width` as a percentage, do it via `style` or `class`
   * of the corresponding DOM element.
   * Default: `undefined`
  */
  @Input() width?: number
  /** Height in pixels or in CSS units.
   * Percentage units `"%"` are not supported here. If you want to set `height` as a percentage, do it via `style` or `class`
   * of the corresponding DOM element.
   * Default: `undefined`
  */
  @Input() height?: number

  /** Scale for X dimension, e.g. Scale.scaleLinear(). Default: `Scale.scaleLinear()` */
  @Input() xScale?: ContinuousScale
  /** Scale domain (data extent) for X dimension. By default this value is calculated automatically based on data. */
  @Input() xDomain?: [number | undefined, number | undefined]
  /** Constraint the minimum value of the X scale domain. Useful when the data is plotted along the X axis.
   * For example, imagine that you have a chart with dynamic data that has negative values. When values are small
   * (let's say in the range of [-0.01, 0]), you might still want the chart to display some meaningful value range (e.g. [-1, 0]). That can
   * be achieved by setting `xDomainMinConstraint` to `[undefined, -1]`. In addition to that, if you want to cut off the
   * values that are too low (let's say lower than -100), you can set the constraint to `[-100, -1]`
   * Default: `undefined` */
  @Input() xDomainMinConstraint?: [number | undefined, number | undefined]
  /** Constraint the minimum value of the X scale domain. Useful when the data is plotted along the X axis.
   * For example, imagine that you have a chart with dynamic data. When values are small
   * (let's say < 0.01), you might still want the chart to display some meaningful value range (e.g. [0, 1]). That can
   * be achieved by setting `xDomainMaxConstraint` to `[1, undefined]`. In addition to that, if you want to cut off the
   * values that are too high (let's say higher than 100), you can set the constraint to `[1, 100]`
   * Default: `undefined` */
  @Input() xDomainMaxConstraint?: [number | undefined, number | undefined]
  /** Force set the X scale range (in the screen space). By default the range is calculated automatically based on the
   * chart's set up */
  @Input() xRange?: [number, number]

  /** Scale for Y dimension, e.g. Scale.ScaleLinear. Default: `Scale.ScaleLinear()` */
  @Input() yScale?: ContinuousScale
  /** Scale domain (data extent) for Y dimension. By default this value is calculated automatically based on data. */
  @Input() yDomain?: [number | undefined, number | undefined]
  /** Constraint the minimum value of the Y scale domain.
   * For example, imagine that you have a chart with dynamic data that has negative values. When values are small
   * (let's say in the range of [-0.01, 0]), you might still want the chart to display some meaningful value range (e.g. [-1, 0]). That can
   * be achieved by setting `yDomainMinConstraint` to `[undefined, -1]`. In addition to that, if you want to cut off the
   * values that are too low (let's say lower than -100), you can set the constraint to `[-100, -1]`
   * Default: `undefined` */
  @Input() yDomainMinConstraint?: [number | undefined, number | undefined] = undefined
  /** Constraint the minimum value of the Y scale domain.
   * For example, imagine that you have a chart with dynamic data. When values are small
   * (let's say < 0.01), you might still want the chart to display some meaningful value range (e.g. [0, 1]). That can
   * be achieved by setting `yDomainMaxConstraint` to `[1, undefined]`. In addition to that, if you want to cut off the
   * values that are too high (let's say higher than 100), you can set the constraint to `[1, 100]`
   * Default: `undefined` */
  @Input() yDomainMaxConstraint?: [number | undefined, number | undefined]
  /** Force set the Y scale range (in the screen space). By default the range is calculated automatically based on the
   * chart's set up */
  @Input() yRange?: [number, number]
  /** Y Axis direction. Default: `Direction.North` */
  @Input() yDirection?: Direction.South | Direction.North | string = Direction.North
  /** Prevents the chart domain from being empty (when domain's min and max values are equal).
   *  That usually happens when all the data values are the same or when there's no data.
   *  Setting to `true` will automatically extend the domain by `+1` when needed.
   *  Setting to `null` will extend the domain only when there's no data.
   *  Setting to `false` will keep the domain as is.
   *  Default: `null` */
  @Input() preventEmptyDomain?: boolean | null = null

  /** Animation duration of all the components within the container. Default: `undefined` */
  @Input() duration?: number = undefined
  /** Margins. Default: `{ top: 0, bottom: 0, left: 0, right: 0 }` */
  @Input() margin?: Spacing = { top: 0, bottom: 0, left: 0, right: 0 }
  /** Padding. Default: `{ top: 0, bottom: 0, left: 0, right: 0 }` */
  @Input() padding?: Spacing = {}
  /** Sets the Y scale domain based on the current X scale domain (not the whole dataset). Default: `false` */
  @Input() scaleByDomain?: boolean
  /** Enables automatic calculation of chart margins based on the size of the axes. Default: `true` */
  @Input() autoMargin?: boolean = true
  /** Override the automatically calculated bleed — the extra space (in pixels) the components request
   * to fully fit into the container (e.g. half of the point diameter for Scatter), which gets subtracted
   * from the scale ranges. Accepts a `Spacing` object or a function that receives the container's
   * components (their individual bleed values are available via the `bleed` getter) and returns one.
   * The sides you provide replace the calculated values, the sides left `undefined` fall back to them —
   * pass `0` explicitly to remove the bleed on a side.
   * Useful for synchronizing the scale ranges of multiple charts, since the final bleed is provided
   * to the `onRenderComplete` callback. Default: `undefined` */
  @Input() bleed?: Spacing | ((components: XYComponentCore<Datum>[]) => Spacing)

  /** Enables zooming and panning along the X axis:
   * - the mouse wheel zooms once the chart has been clicked or focused, a horizontal scroll pans;
   * - trackpad pinch and `Ctrl` / `⌘` + wheel zoom right away;
   * - dragging with the mouse pans the zoomed chart;
   * - on touch screens, two fingers pinch and pan (one finger keeps moving the Crosshair);
   * - the `+` and `-` keys zoom when the chart is focused;
   * - double click resets the zoom.
   *
   * The container applies the zoom by itself and reports it via `onZoom`. A new `xDomain` value replaces the zoomed domain.
   * Set `scaleByDomain` to `true` to fit the Y domain to the visible data. Default: `false` */
  @Input() zoom?: boolean
  /** Limits of zooming out and panning. By default, the extent of the data combined with `xDomain`. Default: `undefined` */
  @Input() zoomExtent?: [number | undefined, number | undefined]
  /** Minimum width of the zoomed X domain in the data space. By default, two steps between the closest data points. Default: `undefined` */
  @Input() zoomMinSpan?: number
  /** Callback function to be called when the user zooms or pans the chart. Receives the new X domain,
   * or `undefined` when the zoom has been reset, and the event that caused the change. Default: `undefined` */
  @Input() onZoom?: (xDomain: [number, number] | undefined, event?: WheelEvent | PointerEvent | MouseEvent | KeyboardEvent) => void

  /** Lets keyboard users explore the data when the chart has a Crosshair. The chart becomes a single tab stop:
   * - `←` / `→` move the Crosshair between the data points, `Home` / `End` jump to the first and last ones,
   *   `Page Up` / `Page Down` jump by a tenth of them;
   * - `↑` / `↓` highlight the series above or below;
   * - `Esc` hides the Crosshair.
   *
   * The active data point is announced to screen readers. When `zoom` is enabled, the chart pans to keep it visible. Default: `true` */
  @Input() keyboardNavigation?: boolean = true
  /** Custom screen reader announcement for the active data point. Receives the X value, the datum, its index, and
   * the index of the highlighted series (in the order of the Crosshair circles: stacked first) or `undefined`.
   * By default, the text of the Crosshair template or the X and Y values. Default: `undefined` */
  @Input() keyboardAnnouncement?: (x: number | Date, datum: Datum, datumIndex: number, seriesIndex?: number) => string

  /** Alternative text description of the chart for accessibility purposes. It will be applied as an
   * `aria-label` attribute to the div element containing your chart. Default: `undefined`.
  */
  @Input() ariaLabel?: string | null | undefined

  /** A custom color function to be used for all the components within the container.
   * Maps indices or data color keys (when `colorKeys` are provided to components) to colors.
   * Default: `undefined`
  */
  @Input() colorFunction?: ColorFunction

  /** Data to be passed to all child components. But if `data` is `undefined` it'll to be passed allowing components to
   * have their individual data. Default: `undefined` */
  @Input() data?: Datum[] | undefined = undefined

  chart: XYContainer<Datum>

  ngAfterViewInit (): void {
    this.chart = new XYContainer<Datum>(this.containerRef.nativeElement, this.getConfig(), this.data)
    this.passContainerReferenceToChildren()
  }

  ngAfterContentInit (): void {
    // QueryList does unsubscribe automatically when it gets destroyed
    this.visComponents.changes.subscribe(() => {
      this.passContainerReferenceToChildren()
      this.chart?.updateContainer(this.getConfig())
    })
  }

  ngOnChanges (changes: SimpleChanges): void {
    const preventRender = true

    // Set new Data without re-render
    if (changes.data && this.data !== undefined) {
      this.chart?.setData(this.data, preventRender)
      delete changes.data
    }

    // Update Container and render
    this.chart?.updateContainer(this.getConfig())
  }

  getConfig (): XYContainerConfigInterface<Datum> {
    const {
      duration, margin, padding, scaleByDomain, autoMargin, bleed, width, height,
      xScale, xDomain, xDomainMinConstraint, xDomainMaxConstraint, xRange,
      yScale, yDomain, yDomainMinConstraint, yDomainMaxConstraint, yRange,
      yDirection, ariaLabel, colorFunction,
      zoom, zoomExtent, zoomMinSpan, onZoom, keyboardNavigation, keyboardAnnouncement,
    } = this
    const visComponents = this.visComponents.toArray().map(d => d.component)

    const crosshair = visComponents.find(c => c instanceof Crosshair) as Crosshair<Datum>
    const tooltip = this.tooltipComponent?.component as Tooltip
    const xAxis = visComponents.find(c => c instanceof Axis && c?.config?.type === 'x') as Axis<Datum>
    const yAxis = visComponents.find(c => c instanceof Axis && c?.config?.type === 'y') as Axis<Datum>
    const annotations = this.annotationsComponent?.component as Annotations

    const components = visComponents.filter(c => !(c instanceof Crosshair) && !(c instanceof Tooltip) && !(c instanceof Axis))

    return {
      components,
      width,
      height,
      duration,
      margin,
      padding,
      xAxis,
      yAxis,
      tooltip,
      crosshair,
      annotations,
      scaleByDomain,
      autoMargin,
      bleed,
      xScale,
      xDomain,
      xDomainMinConstraint,
      xDomainMaxConstraint,
      xRange,
      yScale,
      yDomain,
      yDomainMinConstraint,
      yDomainMaxConstraint,
      yRange,
      yDirection,
      ariaLabel,
      colorFunction,
      zoom,
      zoomExtent,
      zoomMinSpan,
      onZoom,
      keyboardNavigation,
      keyboardAnnouncement,
    }
  }

  passContainerReferenceToChildren (): void {
    // We set the container for each vis component to trigger chart re-render if the data has changed
    if (this.chart) this.visComponents.toArray().forEach(c => { c.componentContainer = this.chart })
  }

  ngOnDestroy (): void {
    this.chart?.destroy()
  }
}
