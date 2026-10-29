import { css } from '@/styles/emotion'
import { extent, merge as mergeArrays } from 'd3-array'
import { Selection, select } from 'd3-selection'

// Global CSS variables (side effects import)
import '@/styles/index'

// Core
import { ContainerCore } from '@/core/container'
import { XYComponentCore } from '@/core/xy-component'
import { XYComponentConfigInterface } from '@/core/xy-component/config'

// Components
import type { Tooltip } from '@/components/tooltip'
import { CrosshairDefaultConfig } from '@/components/crosshair/config'
import type { CrosshairSeries } from '@/components/crosshair/types'

// Data Model
import { CoreDataModel } from '@/data-models/core'

// Types
import { Spacing } from '@/types/spacing'
import { AxisType } from '@/components/axis/types'
import { ContinuousScale, ScaleDimension } from '@/types/scale'
import { Direction } from '@/types/direction'

// Utils
import { clamp, clean, flatten, getNumber, isFunction, isNumber } from '@/utils/data'
import { guid } from '@/utils/misc'
import { constrainDomain, getMinStep, getTextContent, transformDomain } from './utils'

// Config
import { XYContainerDefaultConfig, XYContainerConfigInterface } from './config'

// Constants
import {
  XY_KEYBOARD_PAGE_FRACTION,
  XY_KEYBOARD_PAN_PADDING,
  XY_ZOOM_AUTO_MIN_SPAN_STEPS,
  XY_ZOOM_DRAG_THRESHOLD_PX,
  XY_ZOOM_KEYBOARD_FACTOR,
  XY_ZOOM_PINCH_WHEEL_MULTIPLIER,
  XY_ZOOM_WHEEL_DELTA_MULTIPLIERS,
  XY_ZOOM_WHEEL_MAX_EXPONENT,
  XY_ZOOM_WHEEL_PAN_MULTIPLIERS,
} from './constants'

// Styles
import * as s from './style'

/** Configuration of any XY component. All fields are optional because `updateComponents` merges partial updates.
 * Concrete component config interfaces (e.g. `LineConfigInterface`) extend the base one,
 * so they can all be passed where this type is expected */
export type XYConfigInterface<Datum> = Partial<XYComponentConfigInterface<Datum>>

export class XYContainer<Datum> extends ContainerCore {
  protected _defaultConfig = XYContainerDefaultConfig as XYContainerConfigInterface<Datum>
  protected declare _svgDefs: Selection<SVGDefsElement, unknown, null, undefined>
  public datamodel: CoreDataModel<Datum[]> = new CoreDataModel()
  public config: XYContainerConfigInterface<Datum> = this._defaultConfig
  private _clipPath: Selection<SVGClipPathElement, unknown, null, undefined>
  private _clipPathId = guid()
  private _axisMargin: Spacing = { top: 0, bottom: 0, left: 0, right: 0 }
  private _componentsBleed: Spacing = { top: 0, bottom: 0, left: 0, right: 0 }
  private _firstRender = true
  private _defaultTooltip: Tooltip | undefined

  // Zoom
  /** X domain set by zooming and panning. When `undefined`, the domain comes from `xDomain` or the data */
  private _zoomDomain: [number, number] | undefined
  /** Limits of zooming out and panning, updated on every render */
  private _zoomExtent: [number, number] | undefined
  /** X domain without the zoom (from `xDomain` or the data), updated on every render */
  private _unzoomedXDomain: [number, number] | undefined
  /** Automatic minimum span of the zoomed domain, calculated lazily once per render (`null` when not calculated yet) */
  private _zoomAutoMinSpan: number | undefined | null = null
  /** Zoom gestures render the chart without animations */
  private _isZoomRenderPending = false
  private _zoomDrag: { pointerId: number; startPx: number; scale: ContinuousScale; isActive: boolean } | undefined
  private _zoomTouches = new Map<number, [number, number]>()
  private _zoomPinch: { scale: ContinuousScale; fromPx: number; distance: number } | undefined

  // Keyboard navigation
  private _keyboardDatumIndex: number | undefined
  private _keyboardSeriesId: string | undefined
  private _isKeyboardCrosshairShown = false
  private _liveRegion: Selection<HTMLDivElement, unknown, null, undefined> | undefined
  private _hasOwnTabIndex: boolean

  constructor (element: HTMLElement, config?: XYContainerConfigInterface<Datum>, data?: Datum[]) {
    super(element)

    this._clipPath = this.svg.append('clipPath')
      .attr('id', this._clipPathId)
    this._clipPath.append('rect')

    // When the base tag is specified on the HTML head,
    //  Safari fails to find the corresponding filter URL.
    //  We have to provide tull url in order to fix that
    const highlightFilterId = 'saturate'
    const baseUrl = window.location.href.replace(window.location.hash, '')
    this.svg.classed(css`
      --highlight-filter-id: url(${baseUrl}#${highlightFilterId}); // defining a css variable
    `, true)

    this._svgDefs.append('filter')
      .attr('id', highlightFilterId)
      .attr('filterUnits', 'objectBoundingBox')
      .html('<feColorMatrix type="saturate" in="SourceGraphic" values="1.35"/>')

    // Zoom and keyboard navigation. The zoom listeners go first, so the Crosshair can tell if a wheel event zoomed the chart
    this.svg
      .on('wheel.xy-zoom', this._onZoomWheel.bind(this))
      .on('pointerdown.xy-zoom', this._onZoomPointerDown.bind(this))
      .on('pointermove.xy-zoom', this._onZoomPointerMove.bind(this))
      .on('pointerup.xy-zoom pointercancel.xy-zoom', this._onZoomPointerUp.bind(this))
      .on('dblclick.xy-zoom', this._onZoomDoubleClick.bind(this))

    this._hasOwnTabIndex = element.hasAttribute('tabindex')
    select(element)
      .on('keydown.xy-keyboard', this._onKeyDown.bind(this))
      .on('focus.xy-keyboard', this._onFocus.bind(this))
      .on('blur.xy-keyboard', this._onBlur.bind(this))

    if (config) {
      this.updateContainer(config, true)
    }

    if (data) {
      this.setData(data, true)
    }

    // Render if there are axes or components with data
    if (
      this.config.xAxis ||
      this.config.yAxis ||
      this.components?.some(c => c.datamodel.data)
    ) {
      this.render()
    }

    // Force re-render axes when fonts are loaded
    (document as any).fonts?.ready.then(() => {
      if (!this._firstRender) this._renderAxes(0)
    })
  }

  get components (): XYComponentCore<Datum>[] {
    return this.config.components
  }

  // Overriding ContainerCore default get width method to work with axis auto margin
  get width (): number {
    const margin = this._getMargin()
    return clamp(this.containerWidth - margin.left - margin.right, 0, Number.POSITIVE_INFINITY)
  }

  // Overriding ContainerCore default get height method to work with axis auto margin
  get height (): number {
    const margin = this._getMargin()

    return clamp(this.containerHeight - margin.top - margin.bottom, 0, Number.POSITIVE_INFINITY)
  }

  public setData (data: Datum[], preventRender?: boolean): void {
    const { components, config } = this
    if (!data) return

    const hasDataUpdated = this.datamodel.data !== data
    this.datamodel.data = data

    // Components that already hold this exact data instance are skipped: this makes
    // re-running `setData` from `updateContainer` cheap when only new components need the data
    components.forEach((c) => {
      if (c.datamodel.data !== data) c.setData(data)
    })

    if (config.crosshair && config.crosshair.datamodel.data !== data) config.crosshair.setData(data)
    if (config.xAxis && config.xAxis.datamodel.data !== data) config.xAxis.setData(data)
    if (config.yAxis && config.yAxis.datamodel.data !== data) config.yAxis.setData(data)

    // Hide tooltip and crosshair if the data has changed
    // Important: We still want to do `setData` for the components above even if the data hasn't changed
    // because calling `updateContainer` may add new components and we need to pass them the data
    if (hasDataUpdated) {
      this._keyboardDatumIndex = undefined
      this._isKeyboardCrosshairShown = false
      config.tooltip?.hide()
      // Before the first render there's nothing to hide, and `hide()` would render the crosshair before it gets the fallback accessors
      if (!this._firstRender) config.crosshair?.hide()
    }

    if (!preventRender) this.render()
  }

  public updateContainer (containerConfig: XYContainerConfigInterface<Datum>, preventRender?: boolean): void {
    const prevXDomain = this.config.xDomain
    super.updateContainer(containerConfig)

    // A new `xDomain` value (compared by value, so re-renders of the framework wrappers don't reset the zoom) replaces the zoomed domain
    const xDomain = this.config.xDomain
    if (!this.config.zoom || prevXDomain?.[0] !== xDomain?.[0] || prevXDomain?.[1] !== xDomain?.[1]) this._zoomDomain = undefined

    const crosshair = containerConfig.crosshair
    const providedTooltip = containerConfig.tooltip === this._defaultTooltip ? undefined : containerConfig.tooltip
    const needsDefaultTooltip = !providedTooltip && !crosshair?.config.tooltip &&
      crosshair?.config.template && crosshair.config.template !== CrosshairDefaultConfig.template
    if (needsDefaultTooltip) {
      this._defaultTooltip ??= crosshair.createTooltip()
    } else {
      this._defaultTooltip?.destroy()
      this._defaultTooltip = undefined
    }
    this.config.tooltip = providedTooltip ?? this._defaultTooltip

    // If there were any new components added we need to pass them data
    this.setData(this.datamodel.data, true)

    // Set up the axes
    if (containerConfig.xAxis) this.config.xAxis.config.type = AxisType.X
    if (containerConfig.yAxis) this.config.yAxis.config.type = AxisType.Y

    // Set up the tooltip
    const tooltip = this.config.tooltip
    if (tooltip) {
      if (!tooltip.hasContainer()) tooltip.setContainer(this._container)
      tooltip.setComponents(this.components)
    }

    // Set up the crosshair
    if (crosshair) {
      crosshair.setContainer(this.svg)
      crosshair.tooltip = tooltip
    }

    this._updateFocusability()

    // Sync the SVG children (clipping path, defs, axes, components, crosshair and annotations)
    // with the updated configuration, touching only the elements that changed.
    // The clipping path and defs go first: Safari lays out SVG children in document order, so an element placed
    // before its <clipPath> caches bounds from the clip rect's previous (initially empty) size and isn't painted with `duration: 0`
    this._reconcileChildren([
      this._clipPath.node(),
      this._svgDefs.node(),
      this._svgDefsExternal.node(),
      containerConfig.xAxis?.element,
      containerConfig.yAxis?.element,
      ...this.components.map(c => c.element),
      crosshair?.element,
      containerConfig.annotations?.element,
    ])

    // Rendering
    if (!preventRender) this.render()
  }

  public updateComponents<C extends XYConfigInterface<Datum>> (componentConfigs: C[], preventRender?: boolean): void {
    const { config } = this

    // Configs are matched to components by array index
    if (componentConfigs && componentConfigs.length !== this.components.length) {
      console.warn('Unovis | XY Container: The number of provided component configs doesn\'t match the number of components. Configs are matched to components by index, so some components won\'t be updated')
    }

    this.components.forEach((c, i) => {
      const componentConfig = componentConfigs[i]
      if (componentConfig) {
        c.setConfig(componentConfigs[i])
      }
    })

    // The scales will be updated in `_preRender` during the scheduled render
    if (!preventRender) this.render()
  }

  public update<C extends XYConfigInterface<Datum>> (containerConfig: XYContainerConfigInterface<Datum>, componentConfigs?: C[], data?: Datum[]): void {
    if (data) this.datamodel.data = data // Just updating the data model because the `updateContainer` method has the `setData` step inside
    if (containerConfig) this.updateContainer(containerConfig, true)
    if (componentConfigs) this.updateComponents(componentConfigs, true)
    this.render()
  }

  protected _preRender (): void {
    const { config } = this
    super._preRender()
    this._zoomAutoMinSpan = null

    // Set the scales and update their domains once per render cycle
    // (the domains depend only on the data and the configuration, not on the sizing steps below)
    const scaledComponents = clean([...this.components, config.xAxis, config.yAxis, config.crosshair])
    this._setScales(...scaledComponents)
    this._updateScalesDomain(...scaledComponents)

    // Calculate extra margin required to fit the axes
    if (config.autoMargin) {
      this._setAutoMargin()
    }

    // Pass size, margin, and the color function to the components
    const components = clean([...this.components, config.xAxis, config.yAxis, config.crosshair, config.annotations])
    this._propagateSizeAndStyleToComponents(components, this._getMargin())

    // Update the scale ranges to the final size and margin
    this._updateScalesRange(...scaledComponents)
  }

  protected _render (customDuration?: number): void {
    const { config } = this
    super._render()

    const duration = this._isZoomRenderPending ? 0 : customDuration
    this._isZoomRenderPending = false

    // Get chart total margin after auto margin calculations
    const margin = this._getMargin()

    // Render components
    for (const c of this.components) {
      c.g.attr('transform', `translate(${margin.left},${margin.top})`)
        .style('clip-path', c.clippable ? `url(#${this._clipPathId})` : null)
        .style('-webkit-clip-path', c.clippable ? `url(#${this._clipPathId})` : null)

      c.render(duration)
    }

    this._renderAxes(this._firstRender ? 0 : duration)

    // Clip Rect
    // Extending the clipping path to allow small overflow (e.g. Line will looks better that way when it touches the edges)
    const clipPathExtension = config.clipPathExtend
    this._clipPath.select('rect')
      .attr('x', -clipPathExtension)
      .attr('y', -clipPathExtension)
      .attr('width', this.width + 2 * clipPathExtension)
      .attr('height', this.height + 2 * clipPathExtension)

    // Tooltip
    config.tooltip?.update() // Re-bind events

    // Crosshair
    const crosshair = config.crosshair
    // Let a touch drag move the Tooltip or the Crosshair instead of scrolling the page (see their `followTouchMove` options)
    const followTouchMove = crosshair?.config.followTouchMove || config.tooltip?.followsTouchMove()
    // With `zoom`, the chart handles pinch gestures by itself
    const touchAction = config.zoom ? (followTouchMove ? 'none' : 'pan-y') : (followTouchMove ? 'pinch-zoom' : null)
    this.svg.style('touch-action', touchAction)
    if (crosshair) {
      const nonStackedComponents = this.components.filter(c => !c.stacked)
      const stackedComponents = this.components.filter(c => c.stacked)
      // Pass accessors
      const yAccessors = nonStackedComponents.map(c => c.config.y)
      const yStackedAccessors = stackedComponents.map(c => c.config.y)
      const baselineAccessor = this.components.map(c => c.getBaselineAccessor()).find(Boolean)

      // Setting up fallback accessors for the crosshair to be used if they are not configured explicitly
      crosshair.accessors = {
        x: this.components[0]?.config.x,
        y: flatten(yAccessors),
        yStacked: flatten(yStackedAccessors),
        baseline: baselineAccessor,
      }

      // One color key per `y` accessor, in the order of the Crosshair circles: stacked first, then regular
      const colorKeys = [...stackedComponents, ...nonStackedComponents]
        .flatMap(c => flatten([c.config.y]).map((_, i) => c.config.colorKeys?.[i]))

      crosshair.colorKeys = colorKeys
      crosshair.g.attr('transform', `translate(${margin.left},${margin.top})`)
        .style('clip-path', `url(#${this._clipPathId})`)
        .style('-webkit-clip-path', `url(#${this._clipPathId})`)
      crosshair.render()
    }

    config.annotations?.g.attr('transform', `translate(${margin.left},${margin.top})`)
    config.annotations?.render()

    this._firstRender = false
    config.onRenderComplete?.(this.svg.node(), margin, this._componentsBleed, this.containerWidth, this.containerHeight, this.width, this.height)
  }

  private _setScales<T extends XYComponentCore<Datum>> (...components: T[]): void {
    const { config } = this
    if (!components) return

    // Set the X and Y scales
    if (config.xScale) components.forEach(c => c.setScale(ScaleDimension.X, config.xScale))
    if (config.yScale) components.forEach(c => c.setScale(ScaleDimension.Y, config.yScale))
  }

  private _updateScalesDomain<T extends XYComponentCore<Datum>> (...components: T[]): void {
    const { config } = this
    if (!components) return

    const componentsWithDomain = components.filter(c => !c.config.excludeFromDomainCalculation)

    // Loop over all the dimensions
    Object.values(ScaleDimension).forEach((dimension: ScaleDimension) => {
      const [min, max] = extent(
        mergeArrays(
          componentsWithDomain.map(c => c.getDataExtent(dimension, config.scaleByDomain))
        ) as number[]
      ) // Components with undefined dimension accessors will return [undefined, undefined] but d3.extent will take care of that

      const configuredDomain = dimension === ScaleDimension.Y ? config.yDomain : config.xDomain
      const configuredDomainMinConstraint = dimension === ScaleDimension.Y ? config.yDomainMinConstraint : config.xDomainMinConstraint
      const configuredDomainMaxConstraint = dimension === ScaleDimension.Y ? config.yDomainMaxConstraint : config.xDomainMaxConstraint
      const domainMin = configuredDomain?.[0] ?? min ?? 0
      const domainMax = configuredDomain?.[1] ?? max ?? 1
      const domain = [
        clamp(domainMin, configuredDomainMinConstraint?.[0] ?? Number.NEGATIVE_INFINITY, configuredDomainMinConstraint?.[1] ?? Number.POSITIVE_INFINITY),
        clamp(domainMax, configuredDomainMaxConstraint?.[0] ?? Number.NEGATIVE_INFINITY, configuredDomainMaxConstraint?.[1] ?? Number.POSITIVE_INFINITY),
      ]

      // Extend the X and Y domains if they're empty and `preventEmptyDomain` was explicitly set to `true`
      // or just the X domain if there is no data provided and `preventEmptyDomain` set to `null`
      if (domain[0] === domain[1]) {
        const hasDataProvided = componentsWithDomain.some(c => c.datamodel.data?.length > 0)
        if (config.preventEmptyDomain || (config.preventEmptyDomain === null && (!hasDataProvided || dimension === ScaleDimension.Y))) {
          domain[1] = domain[0] + 1
        }
      }

      // Apply the zoomed X domain, keeping it within the data extent combined with the configured domain
      if (dimension === ScaleDimension.X) {
        this._unzoomedXDomain = [domain[0], domain[1]]
        this._zoomExtent = [
          config.zoomExtent?.[0] ?? Math.min(domain[0], min ?? domain[0]),
          config.zoomExtent?.[1] ?? Math.max(domain[1], max ?? domain[1]),
        ]

        if (config.zoom && this._zoomDomain) {
          this._zoomDomain = constrainDomain(this._zoomDomain, this._zoomExtent, this._getZoomMinSpan())
          domain[0] = this._zoomDomain[0]
          domain[1] = this._zoomDomain[1]
        }
      }

      components.forEach(c => c.setScaleDomain(dimension, domain))
    })
  }

  private _updateScalesRange<T extends XYComponentCore<Datum>> (...components: T[]): void {
    const { config } = this
    if (!components) return

    // Set initial scale range
    const isYDirectionSouth = config.yDirection === Direction.South
    const xRange: [number, number] = [config.padding.left ?? 0, this.width - (config.padding.right ?? 0)]
    const yRange: [number, number] = [this.height - (config.padding.bottom ?? 0), config.padding.top ?? 0]
    if (isYDirectionSouth) yRange.reverse()

    for (const c of components) {
      c.setSize(this.width, this.height, this.containerWidth, this.containerHeight)
      c.setScaleRange(ScaleDimension.X, config.xRange ?? xRange)
      c.setScaleRange(ScaleDimension.Y, config.yRange ?? yRange)
    }

    // Get and combine bleed. The bleed of the final `_updateScalesRange` call of the render
    // cycle is stored, so `_render` can pass it to `onRenderComplete` without recomputing
    const bleed = this._getBleed(components)
    this._componentsBleed = bleed

    // Update scale range
    for (const c of components) {
      c.setScaleRange(ScaleDimension.X, [xRange[0] + bleed.left, xRange[1] - bleed.right])
      c.setScaleRange(
        ScaleDimension.Y,
        isYDirectionSouth
          ? [yRange[0] + bleed.top, yRange[1] - bleed.bottom] // if Y axis is directed downwards
          : [yRange[0] - bleed.bottom, yRange[1] + bleed.top] // if Y axis is directed upwards
      )
    }
  }

  private _renderAxes (duration: number): void {
    const { config: { xAxis, yAxis } } = this
    const margin = this._getMargin()

    const axes = clean([xAxis, yAxis])
    axes.forEach(axis => {
      const offset = axis.getOffset(margin)
      axis.g.attr('transform', `translate(${offset.left},${offset.top})`)
      axis.render(duration)
    })
  }

  private _setAutoMargin (): void {
    const { config: { xAxis, yAxis } } = this
    const components = clean([...this.components, xAxis, yAxis])

    // Calculate margin required by the axes. The scale domains have been updated in `_preRender`
    // We do two iterations on the first render, because the amount and size of ticks can change
    //    after new margin are calculated and applied (axes dimensions will change).
    //    That's needed for correct label placement.
    const numIterations = this._firstRender ? 2 : 1
    for (let i = 0; i < numIterations; i += 1) {
      const axisMargin: Spacing = { top: 0, bottom: 0, left: 0, right: 0 }
      this._updateScalesRange(...components)
      const axes = clean([xAxis, yAxis])
      axes.forEach(axis => {
        axis.preRender()

        const m = axis.getRequiredMargin()
        if (axisMargin.top < m.top) axisMargin.top = m.top
        if (axisMargin.bottom < m.bottom) axisMargin.bottom = m.bottom
        if (axisMargin.left < m.left) axisMargin.left = m.left
        if (axisMargin.right < m.right) axisMargin.right = m.right
      })
      this._axisMargin = axisMargin
    }
  }

  private _getMargin (): Spacing {
    const { config: { margin } } = this
    const defaultMargin = { top: 0, bottom: 0, left: 0, right: 0 }
    const m = margin || defaultMargin

    return {
      top: (m.top || 0) + this._axisMargin.top,
      bottom: (m.bottom || 0) + this._axisMargin.bottom,
      left: (m.left || 0) + this._axisMargin.left,
      right: (m.right || 0) + this._axisMargin.right,
    }
  }

  protected _onResize (): void {
    const { config } = this
    super._onResize()

    // Hide the tooltip and crosshair on resize to prevent them from rendering at a stale position
    config.tooltip?.hide()
    config.crosshair?.hide()
  }

  private _getBleed<T extends XYComponentCore<Datum>> (components: T[]): Spacing {
    // We request the components' bleed even when the configured `bleed` overrides the result,
    // because some components prepare their internal rendering state in the `bleed` getter
    const calculatedBleed = components.map(c => c.bleed).reduce((bleed, b) => {
      for (const key of Object.keys(bleed)) {
        const k = key as keyof Spacing
        if (bleed[k] < b[k]) bleed[k] = b[k]
      }
      return bleed
    }, { top: 0, bottom: 0, left: 0, right: 0 })

    const configuredBleed = isFunction(this.config.bleed) ? this.config.bleed(components) : this.config.bleed
    if (configuredBleed) {
      return {
        top: configuredBleed.top ?? calculatedBleed.top,
        bottom: configuredBleed.bottom ?? calculatedBleed.bottom,
        left: configuredBleed.left ?? calculatedBleed.left,
        right: configuredBleed.right ?? calculatedBleed.right,
      }
    }

    return calculatedBleed
  }

  /** Resets the zoom applied by the user, so the X domain comes from `xDomain` or the data again */
  public resetZoom (event?: MouseEvent | KeyboardEvent): void {
    if (!this._zoomDomain) return

    this._zoomDomain = undefined
    this.config.onZoom?.(undefined, event)
    this.render()
  }

  private _getXScale (): ContinuousScale | undefined {
    const { config } = this
    return clean<XYComponentCore<Datum>>([...this.components, config.xAxis, config.crosshair])[0]?.xScale
  }

  /** The visible X domain, which may not have been rendered yet */
  private _getVisibleXDomain (): [number, number] | undefined {
    return this._zoomDomain ?? this._unzoomedXDomain
  }

  /** A copy of the X scale with the visible domain */
  private _getZoomScale (): ContinuousScale | undefined {
    const scale = this._getXScale()?.copy() as ContinuousScale | undefined
    const domain = this._getVisibleXDomain()
    if (scale && domain) scale.domain(domain)
    return scale
  }

  private _getZoomMinSpan (): number {
    const { config } = this
    if (isNumber(config.zoomMinSpan)) return config.zoomMinSpan

    if (this._zoomAutoMinSpan === null) {
      const values = this.components
        .filter(c => !c.config.excludeFromDomainCalculation && c.config.x && c.datamodel.data?.length)
        .flatMap(c => c.datamodel.data.map((d, i) => getNumber(d, c.config.x, i)))
      const step = getMinStep(values)
      this._zoomAutoMinSpan = step === undefined ? undefined : step * XY_ZOOM_AUTO_MIN_SPAN_STEPS
    }

    return this._zoomAutoMinSpan ?? 0
  }

  private _isZoomed (): boolean {
    const [d0, d1] = this._zoomDomain ?? []
    const [e0, e1] = this._zoomExtent ?? []
    return !!this._zoomDomain && (d1 - d0) < (e1 - e0) * (1 - Number.EPSILON * 4)
  }

  /** Converts a horizontal client (viewport) coordinate to the components' coordinate space */
  private _getPlotX (clientX: number): number {
    return clientX - this.element.getBoundingClientRect().left - this._getMargin().left
  }

  private _setZoomDomain (domain: [number, number], event?: WheelEvent | PointerEvent | MouseEvent | KeyboardEvent, anchor?: number, animate = false): void {
    if (!this._zoomExtent || !domain.every(isFinite)) return

    const newDomain = constrainDomain(domain, this._zoomExtent, this._getZoomMinSpan(), anchor)
    const currentDomain = this._getVisibleXDomain()
    if (newDomain[0] === currentDomain?.[0] && newDomain[1] === currentDomain?.[1]) return

    this._zoomDomain = newDomain
    this._isZoomRenderPending = this._isZoomRenderPending || !animate
    this.config.onZoom?.(newDomain, event)
    this.render()
  }

  private _isFocused (): boolean {
    const root = this._container.getRootNode() as Document | ShadowRoot
    return this._container.contains(root.activeElement)
  }

  private _onZoomWheel (event: WheelEvent): void {
    const scale = this._getZoomScale()
    // Trackpad pinch gestures come as wheel events with `ctrlKey`
    const isPinch = event.ctrlKey || event.metaKey
    if (!this.config.zoom || !scale || (!isPinch && !this._isFocused())) return

    event.preventDefault()
    const px = this._getPlotX(event.clientX)
    const deltaMode = event.deltaMode ?? 0
    const isPan = !isPinch && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
    if (isPan) {
      // Not all browsers turn Shift + wheel into a horizontal scroll
      const delta = (event.deltaX || event.deltaY) * (XY_ZOOM_WHEEL_PAN_MULTIPLIERS[deltaMode] ?? 1)
      this._setZoomDomain(transformDomain(scale, 1, px, px - delta), event)
    } else {
      const exponent = -event.deltaY * (XY_ZOOM_WHEEL_DELTA_MULTIPLIERS[deltaMode] ?? 1) * (event.ctrlKey ? XY_ZOOM_PINCH_WHEEL_MULTIPLIER : 1)
      const k = 2 ** clamp(exponent, -XY_ZOOM_WHEEL_MAX_EXPONENT, XY_ZOOM_WHEEL_MAX_EXPONENT)
      this._setZoomDomain(transformDomain(scale, k, px, px), event, +scale.invert(px))
    }
  }

  private _onZoomPointerDown (event: PointerEvent): void {
    const scale = this._getZoomScale()
    if (!this.config.zoom || !scale) return

    if (event.pointerType === 'touch') {
      // One finger moves the Crosshair, two fingers pinch and pan
      this._zoomTouches.set(event.pointerId, [event.clientX, event.clientY])
      if (this._zoomTouches.size !== 2) return

      const [a, b] = [...this._zoomTouches.values()]
      this._zoomPinch = { scale, fromPx: this._getPlotX((a[0] + b[0]) / 2), distance: Math.hypot(a[0] - b[0], a[1] - b[1]) }
      this.config.crosshair?.hide(event)
      this.config.tooltip?.hide()
    } else if (event.button === 0 && this._isZoomed()) {
      this._zoomDrag = { pointerId: event.pointerId, startPx: this._getPlotX(event.clientX), scale, isActive: false }
    }
  }

  private _onZoomPointerMove (event: PointerEvent): void {
    if (this._zoomTouches.has(event.pointerId)) {
      this._zoomTouches.set(event.pointerId, [event.clientX, event.clientY])
      const pinch = this._zoomPinch
      if (!pinch) return

      // Keep the Crosshair and the Tooltip from following the fingers while pinching
      event.stopImmediatePropagation()
      const [a, b] = [...this._zoomTouches.values()]
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (!distance || !pinch.distance) return

      const toPx = this._getPlotX((a[0] + b[0]) / 2)
      this._setZoomDomain(transformDomain(pinch.scale, distance / pinch.distance, pinch.fromPx, toPx), event, +pinch.scale.invert(pinch.fromPx))
      return
    }

    const drag = this._zoomDrag
    if (drag?.pointerId !== event.pointerId) return
    // The button was released outside of the chart
    if (!(event.buttons & 1)) {
      this._zoomDrag = undefined
      return
    }

    const px = this._getPlotX(event.clientX)
    if (!drag.isActive) {
      if (Math.abs(px - drag.startPx) < XY_ZOOM_DRAG_THRESHOLD_PX) return
      drag.isActive = true
      this.element.setPointerCapture?.(event.pointerId)
      this.svg.style('cursor', 'grabbing')
    }

    this._setZoomDomain(transformDomain(drag.scale, 1, drag.startPx, px), event)
  }

  private _onZoomPointerUp (event: PointerEvent): void {
    if (this._zoomTouches.delete(event.pointerId) && this._zoomTouches.size < 2) this._zoomPinch = undefined

    if (this._zoomDrag?.pointerId === event.pointerId) {
      if (this._zoomDrag.isActive) this.svg.style('cursor', null)
      this._zoomDrag = undefined
    }
  }

  private _onZoomDoubleClick (event: MouseEvent): void {
    if (!this.config.zoom || !this._zoomDomain) return

    event.preventDefault()
    this.resetZoom(event)
  }

  private _isKeyboardNavigationEnabled (): boolean {
    return !!(this.config.keyboardNavigation && this.config.crosshair)
  }

  /** Makes the chart a tab stop when it can be zoomed or navigated with the keyboard,
   * and sets up the live region for the keyboard navigation announcements */
  private _updateFocusability (): void {
    const container = select(this._container)
    const isKeyboardNavigationEnabled = this._isKeyboardNavigationEnabled()
    if (!this._hasOwnTabIndex) container.attr('tabindex', this.config.zoom || isKeyboardNavigationEnabled ? 0 : null)

    if (isKeyboardNavigationEnabled) {
      this._liveRegion ??= container.append('div')
        .attr('class', s.liveRegion)
        .attr('aria-live', 'polite')
        .attr('aria-atomic', true)
    } else {
      this._liveRegion?.remove()
      this._liveRegion = undefined
    }
  }

  /** Indices of the Crosshair data that keyboard navigation can reach, sorted by the x value:
   * the ones within the zoom extent when `zoom` is enabled, or within the X domain otherwise */
  private _getNavigableDataIndices (): number[] {
    const { config: { crosshair } } = this
    const data = crosshair.datamodel.data ?? []
    const domain = this.config.zoom ? this._zoomExtent : this._getVisibleXDomain()
    if (!domain) return []

    const [min, max] = extent(domain)
    return crosshair.getSortedDataIndices().filter(i => {
      const x = getNumber(data[i], crosshair.accessors.x, i)
      return x >= min && x <= max
    })
  }

  private _onKeyDown (event: KeyboardEvent): void {
    const { config } = this
    // Ignore the keys pressed in other focusable elements inside the container (e.g. inputs rendered by the framework wrappers)
    if (event.target !== this._container || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return

    if (config.zoom && ['+', '=', '-'].includes(event.key)) {
      const scale = this._getZoomScale()
      if (!scale) return

      // Zoom around the active data point or the center of the chart
      const crosshair = config.crosshair
      const datumIndex = this._isKeyboardCrosshairShown ? this._keyboardDatumIndex : undefined
      const [r0, r1] = scale.range()
      const px = datumIndex === undefined
        ? (r0 + r1) / 2
        : scale(getNumber(crosshair.datamodel.data[datumIndex], crosshair.accessors.x, datumIndex))
      const k = event.key === '-' ? 1 / XY_ZOOM_KEYBOARD_FACTOR : XY_ZOOM_KEYBOARD_FACTOR

      event.preventDefault()
      this._setZoomDomain(transformDomain(scale, k, px, px), event, +scale.invert(px))
      return
    }

    if (!this._isKeyboardNavigationEnabled()) return

    const indices = this._getNavigableDataIndices()
    if (!indices.length) return

    const crosshair = config.crosshair
    const last = indices.length - 1
    const currentPosition = indices.indexOf(this._keyboardDatumIndex)
    const position = this._isKeyboardCrosshairShown && currentPosition !== -1 ? currentPosition : undefined
    const pageStep = Math.max(1, Math.round(indices.length * XY_KEYBOARD_PAGE_FRACTION))
    let newPosition: number
    switch (event.key) {
      case 'ArrowRight': newPosition = position === undefined ? 0 : position + 1; break
      case 'ArrowLeft': newPosition = position === undefined ? last : position - 1; break
      case 'PageDown': newPosition = (position ?? -1) + pageStep; break
      case 'PageUp': newPosition = (position ?? last + 1) - pageStep; break
      case 'Home': newPosition = 0; break
      case 'End': newPosition = last; break
      case 'ArrowUp':
      case 'ArrowDown': {
        // The series are ordered from top to bottom
        newPosition = position ?? 0
        const series = crosshair.getSeries(indices[newPosition])
        if (!series.length) return

        const i = series.findIndex(d => d.id === this._keyboardSeriesId)
        const next = event.key === 'ArrowUp' ? (i === -1 ? series.length - 1 : i - 1) : (i === -1 ? 0 : i + 1)
        this._keyboardSeriesId = series[clamp(next, 0, series.length - 1)].id
        break
      }
      case 'Escape':
        if (!this._isKeyboardCrosshairShown) return
        this._isKeyboardCrosshairShown = false
        this._keyboardSeriesId = undefined
        this._liveRegion?.text('')
        crosshair.hide(event)
        event.preventDefault()
        return
      default:
        return
    }

    event.preventDefault()
    this._showKeyboardDatum(indices[clamp(newPosition, 0, last)], event)
  }

  private _onFocus (): void {
    // Show the Crosshair only when the chart gets focused with the keyboard, not on click
    if (!this._isKeyboardNavigationEnabled() || !this._container.matches(':focus-visible')) return

    const indices = this._getNavigableDataIndices()
    const datumIndex = indices.includes(this._keyboardDatumIndex) ? this._keyboardDatumIndex : indices[0]
    if (datumIndex !== undefined) this._showKeyboardDatum(datumIndex)
  }

  private _onBlur (): void {
    if (!this._isKeyboardCrosshairShown) return

    this._isKeyboardCrosshairShown = false
    this._liveRegion?.text('')
    this.config.crosshair?.hide()
  }

  private _showKeyboardDatum (datumIndex: number, event?: KeyboardEvent): void {
    const { config } = this
    const crosshair = config.crosshair
    const datum = crosshair.datamodel.data[datumIndex]
    const x = getNumber(datum, crosshair.accessors.x, datumIndex)
    const series = crosshair.getSeries(datumIndex).find(d => d.id === this._keyboardSeriesId)

    // Pan the zoomed chart to keep the data point visible
    const domain = config.zoom ? this._getVisibleXDomain() : undefined
    if (domain && (x < domain[0] || x > domain[1])) {
      const padding = (domain[1] - domain[0]) * XY_KEYBOARD_PAN_PADDING
      const shift = x < domain[0] ? x - padding - domain[0] : x + padding - domain[1]
      this._setZoomDomain([domain[0] + shift, domain[1] + shift], event)
    }

    this._keyboardDatumIndex = datumIndex
    this._isKeyboardCrosshairShown = true
    crosshair.showAtDatum(datumIndex, series?.id, event)
    this._liveRegion?.text(this._getKeyboardAnnouncement(datum, datumIndex, x, series))
  }

  private _getKeyboardAnnouncement (datum: Datum, datumIndex: number, x: number, series: CrosshairSeries | undefined): string {
    const { config } = this
    const crosshair = config.crosshair
    const scale = this._getXScale()
    const xValue = scale?.invert(scale.range()[0]) instanceof Date ? new Date(x) : x
    if (config.keyboardAnnouncement) return config.keyboardAnnouncement(xValue, datum, datumIndex, series?.index)

    const xText = config.xAxis?.config.tickFormat?.(xValue, 0, [xValue] as number[] | Date[]) ?? xValue.toLocaleString()
    const formatY = (y: number): string => config.yAxis?.config.tickFormat?.(y, 0, [y]) ?? y.toLocaleString()
    if (series) {
      const seriesCount = (crosshair.accessors.yStacked?.length ?? 0) + (crosshair.accessors.y?.length ?? 0)
      return `${xText}, series ${series.index + 1} of ${seriesCount}: ${formatY(series.value)}`
    }

    const templateText = getTextContent(crosshair.config.template(datum, x, crosshair.datamodel.data, datumIndex))
    if (templateText) return templateText

    const values = crosshair.getSeries(datumIndex).sort((a, b) => a.index - b.index).map(d => formatY(d.value))
    return values.length ? `${xText}: ${values.join(', ')}` : xText
  }

  public destroy (): void {
    const { components, config: { tooltip, crosshair, annotations, xAxis, yAxis } } = this
    super.destroy()

    const container = select(this._container).on('.xy-keyboard', null)
    if (!this._hasOwnTabIndex) container.attr('tabindex', null)
    this._liveRegion?.remove()

    for (const c of components) c?.destroy()
    tooltip?.destroy()
    crosshair?.destroy()
    annotations?.destroy()
    xAxis?.destroy()
    yAxis?.destroy()
  }
}
