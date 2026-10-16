import { Selection, pointer } from 'd3-selection'
import { easeLinear } from 'd3-ease'
import { least } from 'd3-array'

// Core
import { XYComponentCore } from '@/core/xy-component'
import { Tooltip } from '@/components/tooltip'

// Utils
import { isNumber, isArray, getNumber, clamp, getStackedValues, getNearest, getNearest2D, isFunction } from '@/utils/data'
import { smartTransition } from '@/utils/d3'
import { getColor } from '@/utils/color'

// Types
import { Position } from '@/types/position'
import { FindNearestDirection } from '@/types/data'
import { Spacing } from '@/types/spacing'

// Local Types
import { CrosshairAccessors, CrosshairCircle, CrosshairPointOffset } from './types'
import { CrosshairSnapMode } from './constants'

// Config
import { CrosshairDefaultConfig, CrosshairConfigInterface } from './config'

// Styles
import * as s from './style'


export class Crosshair<Datum> extends XYComponentCore<Datum, CrosshairConfigInterface<Datum>> {
  static selectors = s
  clippable = true // Don't apply clipping path to this component. See XYContainer
  protected _defaultConfig = CrosshairDefaultConfig as CrosshairConfigInterface<Datum>
  public config: CrosshairConfigInterface<Datum> = this._defaultConfig
  container: Selection<SVGSVGElement, any, SVGSVGElement, any>
  line: Selection<SVGLineElement, any, SVGElement, any>
  lineHorizontal: Selection<SVGLineElement, any, SVGElement, any>
  private _xPx: number | undefined = undefined
  private _yPx: number | undefined = undefined
  private _mouseEvent: MouseEvent | undefined = undefined
  private _animFrameId: number = null

  /** Tooltip component to be used by Crosshair if not provided by the config.
   * This property is supposed to be set externally by a container component like XYContainer. */
  public tooltip: Tooltip

  /** Accessors passed externally (e.g. from XYContainer) */
  private _accessors: CrosshairAccessors<Datum> = {
    x: undefined,
    y: undefined,
    yStacked: undefined,
    baseline: undefined,
  }

  private _colorKeys: string[] = []
  public set colorKeys (colorKeys: string[]) { this._colorKeys = colorKeys }
  public get colorKeys (): string[] { return this.config.colorKeys ?? this._colorKeys }

  private _pointOffset: ((index: number, circleIndex: number) => CrosshairPointOffset | undefined) | undefined
  public set pointOffset (pointOffset: ((index: number, circleIndex: number) => CrosshairPointOffset | undefined) | undefined) { this._pointOffset = pointOffset }
  /** How far the points are drawn from their values (e.g. by Scatter's `spreadAxis`), passed externally (e.g. from XYContainer).
   * It follows the components' accessors, so it's dropped when the accessors are configured on the Crosshair itself */
  public get pointOffset (): ((index: number, circleIndex: number) => CrosshairPointOffset | undefined) | undefined {
    const { config } = this
    return (config.x || config.y || config.yStacked) ? undefined : this._pointOffset
  }

  public set accessors (accessors: CrosshairAccessors<Datum>) { this._accessors = accessors }
  public get accessors (): CrosshairAccessors<Datum> {
    const { config } = this

    const hasConfig = !!(config.x || config.y || config.yStacked)
    const x = hasConfig ? config.x : this._accessors.x
    const yAcc = hasConfig ? config.y : this._accessors.y
    const y = yAcc ? (isArray(yAcc) ? yAcc : [yAcc]) : undefined
    const yStacked = hasConfig ? config.yStacked : this._accessors.yStacked
    const baseline = config.baseline ?? this._accessors.baseline

    return { x, y, yStacked, baseline }
  }

  private _isContainerInViewport (): boolean {
    if (!this.container?.node()) return false

    const containerRect = this.container.node().getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight

    // Calculate the visible area of the container
    const visibleWidth = Math.max(0, Math.min(containerRect.right, viewportWidth) - Math.max(containerRect.left, 0))
    const visibleHeight = Math.max(0, Math.min(containerRect.bottom, viewportHeight) - Math.max(containerRect.top, 0))
    const containerArea = containerRect.width * containerRect.height
    const visibleArea = visibleWidth * visibleHeight

    // Container must be at least `visibilityThreshold` (default 35%) visible
    return containerArea > 0 && (visibleArea / containerArea) >= this.config.visibilityThreshold
  }

  constructor (config?: CrosshairConfigInterface<Datum>) {
    super()
    this.setConfig(config)

    this.g.style('opacity', 0)
    this.line = this.g.append('line')
      .attr('class', s.line)
    this.lineHorizontal = this.g.append('line')
      .attr('class', s.lineHorizontal)
      .style('display', 'none')
  }

  get bleed (): Spacing {
    const { config: { circleRadius } } = this

    // We leave the bottom bleed empty because usually the crosshair is used along with the X axis,
    // so we don't need extra space at the bottom. For inverted charts, the users will need to specify
    // the container margins themselves to avoid the crosshair circles from being cut off.
    return { top: circleRadius, left: circleRadius, right: circleRadius }
  }

  setContainer (containerSvg: Selection<SVGSVGElement, unknown, SVGSVGElement, unknown>): void {
    if (this.container === containerSvg) return

    this.container = containerSvg
    this.container.on('pointermove.crosshair', this._onPointerMove.bind(this))
    this.container.on('pointerout.crosshair', this._onPointerOut.bind(this))
    this.container.on('wheel.crosshair', this._onWheel.bind(this))
    // A touch shows the crosshair only while the finger is down
    this.container.on('pointerdown.crosshair', this._onPointerDown.bind(this))
    this.container.on('pointerup.crosshair pointercancel.crosshair', this._onPointerUp.bind(this))
  }

  _render (customDuration?: number): void {
    const { config, datamodel } = this
    const duration = isNumber(customDuration) ? customDuration : config.duration
    const isForceShowAtDefined = config.forceShowAt !== undefined
    const xPx = isForceShowAtDefined ? this.xScale(config.forceShowAt) : this._xPx

    const xValue = this.xScale.invert(xPx) as number

    const leftNearestDatumIndex = (datamodel.data?.length && this.accessors.x)
      ? datamodel.data.indexOf(
        getNearest(datamodel.data, xValue, this.accessors.x, FindNearestDirection.Left)
      ) : undefined

    // If `snapToData` is `true`, we need to find the nearest datum to the crosshair
    // It can be from a mouse interaction or from a `forceShowAt` setting
    let nearestDatum: Datum | undefined
    let nearestDatumIndex: number | undefined
    // Squared pixel distance from the pointer to the snapped datum (only set in `CrosshairSnapMode.XY` mode).
    // Feeds the `nearestDistance` calculation below.
    let nearestDistanceSq: number | undefined
    let nearestSeriesIndex: number | undefined
    if (config.snapToData) {
      if (!this.accessors.y && !this.accessors.yStacked && datamodel.data?.length) {
        console.warn('Unovis | Crosshair: Y accessors have not been configured. Please check if they\'re present in the configuration object')
      }

      // Emit a warning if there's no data to snap to.
      // To keep the console clean, only emit the warning when there's mouse interaction.
      if (!datamodel.data?.length && this._mouseEvent) {
        console.warn('Unovis | Crosshair: No data to snap to. Make sure the data has been passed to the container or to the crosshair itself')
      }

      // In `CrosshairSnapMode.XY` mode we snap to the data point closest to the pointer in both X and Y (pixel space).
      // This requires a real pointer position, so we fall back to X-only snapping when `forceShowAt` is set
      // or there's no pointer Y available yet.
      const useXYMode = config.snapMode === CrosshairSnapMode.XY && !isForceShowAtDefined && this._yPx !== undefined
      if (useXYMode) {
        const pointOffset = this.pointOffset
        const getSnapSegment = pointOffset && ((index: number, circleIndex: number): [[number, number], [number, number]] | undefined => {
          const offset = pointOffset(index, circleIndex)
          return offset && (offset.snapSegment ?? [offset.circle, offset.circle])
        })
        const nearest = getNearest2D(datamodel.data, [this._xPx, this._yPx], this.xScale, this.yScale, this.accessors.x, this.accessors.y, this.accessors.yStacked, this.accessors.baseline, getSnapSegment)
        if (nearest) {
          nearestDatum = nearest.datum
          nearestDatumIndex = nearest.index
          nearestDistanceSq = nearest.distanceSq
          nearestSeriesIndex = nearest.seriesIndex
        }
      } else {
        nearestDatum = getNearest(datamodel.data, xValue, this.accessors.x)
        nearestDatumIndex = datamodel.data.indexOf(nearestDatum)
      }
    }

    const xRange = this.xScale.range()
    const xClamped = config.snapToData && nearestDatum
      ? clamp(Math.round(this.xScale(getNumber(nearestDatum, this.accessors.x, nearestDatumIndex))), 0, this._width)
      : clamp(xPx, 0, this._width)
    const lines = nearestSeriesIndex !== undefined ? this.pointOffset?.(nearestDatumIndex, nearestSeriesIndex)?.lines : undefined
    const lineX = lines ? clamp(Math.round(xClamped + lines[0]), 0, this._width) : xClamped

    const isWithinX = isForceShowAtDefined
      ? (xPx >= Math.min(xRange[0], xRange[1])) && (xPx <= Math.max(xRange[0], xRange[1]))
      : (xPx >= 0) && (xPx <= this._width)
    const isWithinY = (this._yPx >= 0) && (this._yPx <= this._height)
    let shouldShow = config.skipRangeCheck ? !!this._xPx : (this._xPx ? isWithinX && isWithinY : isWithinX)

    // Distance in pixels between the pointer and the snapped datum: the full 2D distance in
    // `CrosshairSnapMode.XY` mode (so a point that's close in X but far in Y still counts as far),
    // or the horizontal distance to the crosshair line otherwise
    const nearestDistance = nearestDistanceSq !== undefined ? Math.sqrt(nearestDistanceSq) : Math.abs(xClamped - (+xPx))

    // If the crosshair is far from the mouse pointer (usually when `snapToData` is `true` and data resolution is low), hide it
    if (config.hideWhenFarFromPointer && (nearestDistance >= config.hideWhenFarFromPointerDistance)) {
      shouldShow = false
    }

    const tooltip = config.tooltip ?? this.tooltip
    if (shouldShow && tooltip && this._isContainerInViewport()) {
      const container = tooltip.getContainer() || this.container.node()
      const isContainerBody = tooltip.isContainerBody()
      const nearestDatumXValue = (this.accessors.x && nearestDatum !== undefined) ? getNumber(nearestDatum, this.accessors.x, nearestDatumIndex) : undefined
      const tooltipXValue = nearestDatumXValue ?? xValue

      if (isForceShowAtDefined) {
        // Convert SVG coordinates to screen coordinates
        const containerRect = this.container.node().getBoundingClientRect()

        // Use the actual left margin from the container
        const screenX = (isContainerBody ? xPx + containerRect.left : xPx) + this._containerMargin.left
        const screenY = this._height / 2 + (isContainerBody ? containerRect.top : 0)
        const pos = [screenX, screenY] as [number, number]
        this._showTooltip(nearestDatum, tooltipXValue, pos, leftNearestDatumIndex, nearestSeriesIndex)
      } else if (this._mouseEvent) {
        const pos = (isContainerBody ? [this._mouseEvent.clientX, this._mouseEvent.clientY] : pointer(this._mouseEvent, container)) as [number, number]
        this._showTooltip(nearestDatum, tooltipXValue, pos, leftNearestDatumIndex, nearestSeriesIndex)
      }
    } else this._hideTooltip()

    // Trigger `onCrosshairMove` if the render was triggered by a mouse move event
    if (this._mouseEvent) {
      config.onCrosshairMove?.(shouldShow ? this.xScale.invert(this._xPx) as number : undefined, nearestDatum, nearestDatumIndex, this._mouseEvent, nearestSeriesIndex)
      this._mouseEvent = undefined
    }

    smartTransition(this.g, duration)
      .style('opacity', shouldShow ? 1 : 0)

    // When `config.forceShowAt` becomes `undefined`, the crosshair "jumps" to the edge of the chart.
    // This looks off, so we stop further rendering when the `xPx` value is not finite.
    if (!isFinite(xPx)) return

    const circleData = isFunction(config.getCircles)
      ? config.getCircles(xValue, datamodel.data, this.yScale, leftNearestDatumIndex)
      : this.getCircleData(nearestDatum, nearestDatumIndex, nearestSeriesIndex)

    this.line
      .attr('y1', 0)
      .attr('y2', this._height)

    smartTransition(this.line, duration, easeLinear)
      .attr('x1', lineX)
      .attr('x2', lineX)

    const lineHorizontalY = config.showHorizontalLine ? this.getLineHorizontalY(circleData, lines?.[1]) : undefined
    this.lineHorizontal
      .style('display', lineHorizontalY === undefined ? 'none' : null)
      .attr('x1', 0)
      .attr('x2', this._width)

    if (lineHorizontalY !== undefined) {
      smartTransition(this.lineHorizontal, duration, easeLinear)
        .attr('y1', lineHorizontalY)
        .attr('y2', lineHorizontalY)
    }

    const circles = this.g
      .selectAll<SVGCircleElement, CrosshairCircle>('circle')
      .data(circleData, (d, i) => d.id ?? i)

    const circlesEnter = circles.enter()
      .append('circle')
      .attr('class', s.circle)
      .attr('r', 0)
      .attr('cx', d => xClamped + (d.offset?.[0] ?? 0))
      .attr('cy', d => d.y + (d.offset?.[1] ?? 0))
      .style('fill', d => d.color)
      .style('stroke', d => d.strokeColor)
      .style('stroke-width', d => d.strokeWidth)

    smartTransition(circlesEnter.merge(circles), duration, easeLinear)
      .attr('cx', d => xClamped + (d.offset?.[0] ?? 0))
      .attr('cy', d => d.y + (d.offset?.[1] ?? 0))
      .attr('r', config.circleRadius)
      .style('opacity', d => d.opacity)
      .style('fill', d => d.color)
      .style('stroke', d => d.strokeColor)
      .style('stroke-width', d => d.strokeWidth)

    smartTransition(circles.exit(), duration, easeLinear)
      .attr('r', 0)
      .style('opacity', 0)
      .remove()
      .on('interrupt', function () { this.remove() })
  }

  hide (sourceEvent?: MouseEvent | WheelEvent): void {
    window.cancelAnimationFrame(this._animFrameId)
    this._animFrameId = window.requestAnimationFrame(() => {
      this._xPx = undefined
      this._yPx = undefined
      this._mouseEvent = undefined
      // We call `onCrosshairMove` with all the arguments set to `undefined` because we want
      // the users to be able to hide the crosshair easily when using `forceShowAt`
      this.config.onCrosshairMove?.(undefined, undefined, undefined, sourceEvent)
      this._render()
    })
  }

  _onPointerMove (event: PointerEvent): void {
    // Ignore all the fingers except the first one
    if (event.pointerType === 'touch' && !event.isPrimary) return

    const { datamodel, element } = this
    if (!this.accessors.x && datamodel.data?.length) {
      console.warn('Unovis | Crosshair: X accessor function has not been configured. Please check if it\'s present in the configuration object')
    }
    const [x, y] = pointer(event, element)
    this._xPx = x
    this._yPx = y
    this._mouseEvent = event

    window.cancelAnimationFrame(this._animFrameId)
    this._animFrameId = window.requestAnimationFrame(() => {
      // We'll call `config.onCrosshairMove` in `_render` with the found `nearestDatum` and `nearestDatumIndex`,
      // which can come from the mouse interaction or from the `forceShowAt` setting
      this._render()
    })
  }

  _onPointerOut (event?: PointerEvent): void {
    if (event?.pointerType === 'touch' && !event.isPrimary) return

    // Safari fires the boundary events of touches and pens without `relatedTarget`, so we look up the element under the pointer
    const root = this.container?.node().getRootNode() as Document | ShadowRoot
    const isDirectPointer = event?.pointerType === 'touch' || event?.pointerType === 'pen'
    const relatedTarget = event?.relatedTarget ?? (isDirectPointer && isFunction(root?.elementFromPoint)
      ? root.elementFromPoint(event.clientX, event.clientY)
      : null)

    // Only hide if the pointer actually left the SVG, not just moved to a child
    if (!event || !this.container?.node().contains(relatedTarget as Node)) {
      this.hide(event)
    }
  }

  _onPointerDown (event: PointerEvent): void {
    // Mouse shows the crosshair on `pointermove` (hover), while a touch or a pen (it can't always hover) shows it right away
    if (event.pointerType === 'touch' || event.pointerType === 'pen') this._onPointerMove(event)
  }

  _onPointerUp (event: PointerEvent): void {
    // `pointercancel` is fired when the browser takes over the gesture, e.g. to scroll the page
    if (event.isPrimary && (event.pointerType === 'touch' || event.type === 'pointercancel')) this.hide(event)
  }

  _onWheel (event: WheelEvent): void {
    this.hide(event)
  }

  protected _onDestroy (): void {
    window.cancelAnimationFrame(this._animFrameId)
    this.container?.on('.crosshair', null)
  }

  _showTooltip (datum: Datum | undefined, xValue: number, pos: [number, number], nearestDatumIndex: number | undefined, seriesIndex?: number): void {
    const { config, datamodel } = this
    const tooltip = config.tooltip ?? this.tooltip
    if (!tooltip || !pos) return

    const [x, y] = pos
    const content = config.template(datum, xValue, datamodel.data, nearestDatumIndex, seriesIndex)
    // Force set `followCursor` to `true` because we don't want Crosshair's tooltip to be hoverable
    tooltip.config.followCursor = true

    // Set tooltip placement based on Crosshair's position (left / right)
    if (!tooltip.config.horizontalPlacement || tooltip.config.horizontalPlacement === Position.Auto) {
      const xRelative = tooltip.isContainerBody() ? x - this.container.node().getBoundingClientRect().left : x
      tooltip.overrideHorizontalPlacement(xRelative > this._containerWidth / 2 ? Position.Left : Position.Right)
    }

    if (content) tooltip.show(content, { x, y })
  }

  _hideTooltip (): void {
    const { config } = this
    const tooltip = config.tooltip ?? this.tooltip
    tooltip?.hide()
  }

  // We don't want Crosshair to be be taken in to account in domain calculations
  getYDataExtent (): number[] {
    return [undefined, undefined]
  }

  /** Y position of the horizontal crosshair line: the value of the circle closest to the pointer (i.e. the snapped data point)
   * moved by `lineOffsetY`, or the pointer position itself when there are no circles to snap to. `undefined` when there's nothing to draw */
  private getLineHorizontalY (circles: CrosshairCircle[], lineOffsetY = 0): number | undefined {
    const yPx = this._yPx
    const visibleCircles = circles.filter(c => c.opacity !== 0 && isFinite(c.y))
    const circle = yPx === undefined ? visibleCircles[0] : least(visibleCircles, c => Math.abs(c.y + (c.offset?.[1] ?? 0) - yPx))
    const y = circle ? circle.y + lineOffsetY : yPx
    return isFinite(y) ? clamp(Math.round(y), 0, this._height) : undefined
  }

  private getCircleData (datum: Datum, datumIndex: number, seriesIndex?: number): CrosshairCircle[] {
    const { config } = this
    const colorOptions = { colorFn: this._colorFunction }
    const colorKeys = this.colorKeys
    const pointOffset = this.pointOffset

    if (config.snapToData && datum) {
      const yAccessors = this.accessors.y ?? []
      const yStackedAccessors = this.accessors.yStacked ?? []
      const baselineValue = getNumber(datum, this.accessors.baseline, datumIndex) || 0
      const stackedValues: CrosshairCircle[] = getStackedValues(datum, datumIndex, ...yStackedAccessors)
        .map((value, index) => ({
          id: `stacked-${index}`,
          y: this.yScale(value + baselineValue),
          opacity: isNumber(getNumber(datum, yStackedAccessors[index], datumIndex)) ? 1 : 0,
          color: getColor(datum, config.color, index, colorKeys?.[index], colorOptions),
          strokeColor: config.strokeColor ? getColor(datum, config.strokeColor, index, colorKeys?.[index], colorOptions) : undefined,
          strokeWidth: config.strokeWidth ? getNumber(datum, config.strokeWidth, index) : undefined,
          offset: pointOffset?.(datumIndex, index)?.circle,
        }))

      const regularValues: CrosshairCircle[] = yAccessors
        .map((a, index) => {
          const value = getNumber(datum, a, datumIndex)
          const circleIndex = stackedValues.length + index
          return {
            id: `regular-${index}`,
            y: this.yScale(value),
            opacity: isNumber(value) ? 1 : 0,
            color: getColor(datum, config.color, circleIndex, colorKeys?.[circleIndex], colorOptions),
            strokeColor: config.strokeColor ? getColor(datum, config.strokeColor, circleIndex, colorKeys?.[circleIndex], colorOptions) : undefined,
            strokeWidth: config.strokeWidth ? getNumber(datum, config.strokeWidth, circleIndex) : undefined,
            offset: pointOffset?.(datumIndex, circleIndex)?.circle,
          }
        })

      return stackedValues.concat(regularValues).filter((d, i) => (seriesIndex === undefined || i === seriesIndex) && isNumber(d.y))
    }

    return []
  }
}
