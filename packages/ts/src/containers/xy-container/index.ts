import { css } from '@/styles/emotion'
import { extent, merge as mergeArrays } from 'd3-array'
import { Selection } from 'd3-selection'

// Global CSS variables (side effects import)
import '@/styles/index'

// Core
import { ContainerCore } from '@/core/container'
import { XYComponentCore } from '@/core/xy-component'
import { XYComponentConfigInterface } from '@/core/xy-component/config'

// Components
import type { Tooltip } from '@/components/tooltip'
import type { Axis } from '@/components/axis'
import { CrosshairDefaultConfig } from '@/components/crosshair/config'

// Data Model
import { CoreDataModel } from '@/data-models/core'

// Types
import { Spacing } from '@/types/spacing'
import { AxisType } from '@/components/axis/types'
import { ScaleDimension } from '@/types/scale'
import { Direction } from '@/types/direction'

// Utils
import { clamp, clean, flatten, isFunction, unique } from '@/utils/data'
import { guid } from '@/utils/misc'
import { getAxisSide } from '@/components/axis/utils'

// Config
import { XYContainerDefaultConfig, XYContainerConfigInterface, XYContainerScaleConfigInterface } from './config'

// Constants
import { AXES_STACK_GAP_PX } from './constants'

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
  private _hasWarnedSharedScale = false

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
    this.svg.attr('class', css`
      --highlight-filter-id: url(${baseUrl}#${highlightFilterId}); // defining a css variable
    `)

    this._svgDefs.append('filter')
      .attr('id', highlightFilterId)
      .attr('filterUnits', 'objectBoundingBox')
      .html('<feColorMatrix type="saturate" in="SourceGraphic" values="1.35"/>')

    if (config) {
      this.updateContainer(config, true)
    }

    if (data) {
      this.setData(data, true)
    }

    // Render if there are axes or components with data
    if (
      this.axes.length ||
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

  /** All the configured axes: the X ones first, then the Y ones */
  get axes (): Axis<Datum>[] {
    const { xAxis, yAxis } = this.config
    return clean(flatten([xAxis ?? [], yAxis ?? []]))
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
    for (const axis of this.axes) {
      if (axis.datamodel.data !== data) axis.setData(data)
    }

    // Hide tooltip and crosshair if the data has changed
    // Important: We still want to do `setData` for the components above even if the data hasn't changed
    // because calling `updateContainer` may add new components and we need to pass them the data
    if (hasDataUpdated) {
      config.tooltip?.hide()
      // Before the first render there's nothing to hide, and `hide()` would render the crosshair before it gets the fallback accessors
      if (!this._firstRender) config.crosshair?.hide()
    }

    if (!preventRender) this.render()
  }

  public updateContainer (containerConfig: XYContainerConfigInterface<Datum>, preventRender?: boolean): void {
    super.updateContainer(containerConfig)

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
    for (const axis of clean(flatten([containerConfig.xAxis ?? []]))) axis.config.type = AxisType.X
    for (const axis of clean(flatten([containerConfig.yAxis ?? []]))) axis.config.type = AxisType.Y

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

    // Sync the SVG children (clipping path, defs, axes, components, crosshair and annotations)
    // with the updated configuration, touching only the elements that changed.
    // The clipping path and defs go first: Safari lays out SVG children in document order, so an element placed
    // before its <clipPath> caches bounds from the clip rect's previous (initially empty) size and isn't painted with `duration: 0`
    this._reconcileChildren([
      this._clipPath.node(),
      this._svgDefs.node(),
      this._svgDefsExternal.node(),
      ...this.axes.map(a => a.element),
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

    // Set the scales and update their domains once per render cycle
    // (the domains depend only on the data and the configuration, not on the sizing steps below)
    const scaledComponents = clean([...this.components, ...this.axes, config.crosshair])
    this._setScales(...scaledComponents)
    this._updateScalesDomain(...scaledComponents)

    // The axes of the scales mapped onto a segment of the chart span only that segment
    for (const axis of this.axes) {
      const dimension = axis.config.type === AxisType.X ? ScaleDimension.X : ScaleDimension.Y
      axis.setRangeSegment(this._getScaleConfig(dimension, this._getScaleKey(axis, dimension)).rangeSegment)
    }

    // Calculate extra margin required to fit the axes. Without `autoMargin` the axes still get measured
    // when several of them share a side, because stacking them requires knowing their sizes.
    // Otherwise they all sit on the chart edge
    if (config.autoMargin) {
      this._setAutoMargin()
    } else if (this._hasStackedAxes()) {
      this._updateScalesRange(...scaledComponents)
      this._layoutAxes()
    } else {
      for (const axis of this.axes) axis.setOffset(0)
    }

    // Pass size, margin, and the color function to the components
    const components = clean([...this.components, ...this.axes, config.crosshair, config.annotations])
    this._propagateSizeAndStyleToComponents(components, this._getMargin())

    // Update the scale ranges to the final size and margin
    this._updateScalesRange(...scaledComponents)
  }

  protected _render (customDuration?: number): void {
    const { config } = this
    super._render()

    // Get chart total margin after auto margin calculations
    const margin = this._getMargin()

    // Render components
    for (const c of this.components) {
      c.g.attr('transform', `translate(${margin.left},${margin.top})`)
        .style('clip-path', c.clippable ? `url(#${this._clipPathId})` : null)
        .style('-webkit-clip-path', c.clippable ? `url(#${this._clipPathId})` : null)

      c.render(customDuration)
    }

    this._renderAxes(this._firstRender ? 0 : customDuration)

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
    if (crosshair) {
      // The crosshair follows a single X scale, its own, so it takes the x accessor and the circles only from the components
      // bound to that scale. The x accessor can come from a component excluded from the crosshair, the circles can't.
      // When the crosshair has no `xScaleKey` and no component is bound to the primary X scale, it follows the X scale
      // of the first component not excluded from it (of the first component when they all are)
      const getXScaleKey = (c: XYComponentCore<Datum>): string | undefined => this._getScaleKey(c, ScaleDimension.X)
      const getYScaleKey = (c: XYComponentCore<Datum>): string | undefined => this._getScaleKey(c, ScaleDimension.Y)
      const isPrimaryXScaleUnused = getXScaleKey(crosshair) === undefined && !this.components.some(c => getXScaleKey(c) === undefined)
      const followedComponent = isPrimaryXScaleUnused ? (this.components.find(c => !c.config.excludeFromCrosshair) ?? this.components[0]) : undefined
      if (followedComponent) crosshair.setScale(ScaleDimension.X, followedComponent.xScale)
      const crosshairXScaleKey = followedComponent ? getXScaleKey(followedComponent) : getXScaleKey(crosshair)
      const xScaleComponents = this.components.filter(c => getXScaleKey(c) === crosshairXScaleKey)
      const crosshairComponents = xScaleComponents.filter(c => !c.config.excludeFromCrosshair)
      const nonStackedComponents = crosshairComponents.filter(c => !c.stacked)
      const stackedComponents = crosshairComponents.filter(c => c.stacked)
      // Pass accessors
      const yAccessors = nonStackedComponents.map(c => c.config.y)
      const yStackedAccessors = stackedComponents.map(c => c.config.y)
      const baselineAccessor = crosshairComponents.map(c => c.getBaselineAccessor()).find(Boolean)

      // Setting up fallback accessors for the crosshair to be used if they are not configured explicitly
      crosshair.accessors = {
        x: xScaleComponents[0]?.config.x,
        y: flatten(yAccessors),
        yStacked: flatten(yStackedAccessors),
        baseline: baselineAccessor,
      }

      // One color key per `y` accessor, in the order of the Crosshair circles: stacked first, then regular
      const colorKeys = [...stackedComponents, ...nonStackedComponents]
        .flatMap(c => flatten([c.config.y]).map((_, i) => c.config.colorKeys?.[i]))

      crosshair.colorKeys = colorKeys
      // The Y scale of the component each accessor comes from, as the components can be bound to different Y scales.
      // The components bound to the crosshair's own Y scale get none, so their circles go on the crosshair's `yScale`
      const crosshairYScaleKey = getYScaleKey(crosshair)
      crosshair.circleYScales = [...stackedComponents, ...nonStackedComponents]
        .flatMap(c => flatten([c.config.y]).map(() => getYScaleKey(c) === crosshairYScaleKey ? undefined : c.yScale))
      // The stacked values accumulate per Y scale, each stack starting from the baseline of the components bound to that scale
      const stackedYScaleKeys = stackedComponents.flatMap(c => flatten([c.config.y]).map(() => getYScaleKey(c)))
      crosshair.stacks = unique(stackedYScaleKeys).map(key => ({
        indices: stackedYScaleKeys.flatMap((k, i) => k === key ? [i] : []),
        baseline: crosshairComponents.filter(c => getYScaleKey(c) === key).map(c => c.getBaselineAccessor()).find(Boolean),
      }))
      // The crosshair is shown over the whole chart even when its Y scale is mapped onto a segment of it
      crosshair.yRangeSegment = this._getScaleConfig(ScaleDimension.Y, crosshairYScaleKey).rangeSegment
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

  /** Key of the named scale a component is bound to in the given dimension, `undefined` for the primary scale */
  private _getScaleKey<T extends XYComponentCore<Datum>> (c: T, dimension: ScaleDimension): string | undefined {
    return dimension === ScaleDimension.X ? c.config.xScaleKey : c.config.yScaleKey
  }

  /** Configuration of the scale a component is bound to: the primary one, configured directly
   * on the container, or a named one from `xScales` / `yScales` */
  private _getScaleConfig (dimension: ScaleDimension, scaleKey: string | undefined): XYContainerScaleConfigInterface {
    const { config } = this
    const isX = dimension === ScaleDimension.X
    if (scaleKey === undefined) {
      return isX
        ? { scale: config.xScale, domain: config.xDomain, domainMinConstraint: config.xDomainMinConstraint, domainMaxConstraint: config.xDomainMaxConstraint, rangeSegment: config.xRangeSegment }
        : { scale: config.yScale, domain: config.yDomain, domainMinConstraint: config.yDomainMinConstraint, domainMaxConstraint: config.yDomainMaxConstraint, rangeSegment: config.yRangeSegment }
    }

    return (isX ? config.xScales : config.yScales)?.[scaleKey] ?? {}
  }

  /** Maps a full scale range onto the segment of the chart the component's scale is configured to take, see `rangeSegment` */
  private _getRangeSegment<T extends XYComponentCore<Datum>> (c: T, dimension: ScaleDimension, range: [number, number]): [number, number] {
    const segment = this._getScaleConfig(dimension, this._getScaleKey(c, dimension)).rangeSegment
    if (!segment) return range
    const [start, end] = range
    return [start + (end - start) * segment[0], start + (end - start) * segment[1]]
  }

  private _setScales<T extends XYComponentCore<Datum>> (...components: T[]): void {
    const { config } = this
    if (!components) return

    // Set the X and Y scale instances provided in the config. The components bound to a scale
    // without one use their own instances, also when they had a shared one before
    for (const c of components) {
      c.setScale(ScaleDimension.X, this._getScaleConfig(ScaleDimension.X, c.config.xScaleKey).scale)
      c.setScale(ScaleDimension.Y, this._getScaleConfig(ScaleDimension.Y, c.config.yScaleKey).scale)
    }

    // An instance configured for several scales would get the domain and the range of each of them in turn
    const namedScales = [config.xScales, config.yScales].flatMap(scales => Object.values(scales ?? {}).map(s => s?.scale))
    const instances = clean([config.xScale, config.yScale, ...namedScales])
    if (!this._hasWarnedSharedScale && unique(instances).length < instances.length) {
      console.warn('Unovis | XY Container: The same scale instance is configured for several scales, so they overwrite each other\'s domain and range. Provide a separate instance for every scale')
      this._hasWarnedSharedScale = true
    }
  }

  private _updateScalesDomain<T extends XYComponentCore<Datum>> (...components: T[]): void {
    const { config } = this
    if (!components) return

    const componentsWithDomain = components.filter(c => !c.config.excludeFromDomainCalculation)

    // Loop over all the dimensions, calculating a domain per scale: the components bound to the same
    // scale key share one (`undefined` being the primary scale)
    Object.values(ScaleDimension).forEach((dimension: ScaleDimension) => {
      const getScaleKey = (c: T): string | undefined => this._getScaleKey(c, dimension)

      for (const scaleKey of unique(components.map(getScaleKey))) {
        const scaleComponents = components.filter(c => getScaleKey(c) === scaleKey)
        const scaleComponentsWithDomain = componentsWithDomain.filter(c => getScaleKey(c) === scaleKey)
        const [min, max] = extent(
          mergeArrays(
            scaleComponentsWithDomain.map(c => c.getDataExtent(dimension, config.scaleByDomain))
          ) as number[]
        ) // Components with undefined dimension accessors will return [undefined, undefined] but d3.extent will take care of that

        const { domain: configuredDomain, domainMinConstraint, domainMaxConstraint } = this._getScaleConfig(dimension, scaleKey)
        const domainMin = configuredDomain?.[0] ?? min ?? 0
        const domainMax = configuredDomain?.[1] ?? max ?? 1
        const domain = [
          clamp(domainMin, domainMinConstraint?.[0] ?? Number.NEGATIVE_INFINITY, domainMinConstraint?.[1] ?? Number.POSITIVE_INFINITY),
          clamp(domainMax, domainMaxConstraint?.[0] ?? Number.NEGATIVE_INFINITY, domainMaxConstraint?.[1] ?? Number.POSITIVE_INFINITY),
        ]

        // Extend the X and Y domains if they're empty and `preventEmptyDomain` was explicitly set to `true`
        // or just the X domain if there is no data provided and `preventEmptyDomain` set to `null`
        if (domain[0] === domain[1]) {
          const hasDataProvided = scaleComponentsWithDomain.some(c => c.datamodel.data?.length > 0)
          if (config.preventEmptyDomain || (config.preventEmptyDomain === null && (!hasDataProvided || dimension === ScaleDimension.Y))) {
            domain[1] = domain[0] + 1
          }
        }

        scaleComponents.forEach(c => c.setScaleDomain(dimension, domain))
      }
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
      c.setScaleRange(ScaleDimension.X, this._getRangeSegment(c, ScaleDimension.X, config.xRange ?? xRange))
      c.setScaleRange(ScaleDimension.Y, this._getRangeSegment(c, ScaleDimension.Y, config.yRange ?? yRange))
    }

    // Get and combine bleed. The bleed of the final `_updateScalesRange` call of the render
    // cycle is stored, so `_render` can pass it to `onRenderComplete` without recomputing
    const bleed = this._getBleed(components)
    this._componentsBleed = bleed

    // Update scale range
    for (const c of components) {
      c.setScaleRange(ScaleDimension.X, this._getRangeSegment(c, ScaleDimension.X, [xRange[0] + bleed.left, xRange[1] - bleed.right]))
      c.setScaleRange(
        ScaleDimension.Y,
        this._getRangeSegment(c, ScaleDimension.Y, isYDirectionSouth
          ? [yRange[0] + bleed.top, yRange[1] - bleed.bottom] // if Y axis is directed downwards
          : [yRange[0] - bleed.bottom, yRange[1] + bleed.top] // if Y axis is directed upwards
        )
      )
    }
  }

  private _renderAxes (duration: number): void {
    const margin = this._getMargin()

    for (const axis of this.axes) {
      const offset = axis.getOffset(margin)
      axis.g.attr('transform', `translate(${offset.left},${offset.top})`)
      axis.render(duration)
    }
  }

  private _setAutoMargin (): void {
    const components = clean([...this.components, ...this.axes])

    // Calculate margin required by the axes. The scale domains have been updated in `_preRender`
    // We do two iterations on the first render, because the amount and size of ticks can change
    //    after new margin are calculated and applied (axes dimensions will change).
    //    That's needed for correct label placement.
    const numIterations = this._firstRender ? 2 : 1
    for (let i = 0; i < numIterations; i += 1) {
      this._updateScalesRange(...components)
      this._axisMargin = this._layoutAxes()
    }
  }

  /** Whether several axes share a side of the chart */
  private _hasStackedAxes (): boolean {
    const sides = this.axes.map(axis => getAxisSide(axis.config))
    return unique(sides).length < sides.length
  }

  /** Measures the axes and stacks the ones sharing a side outwards from the chart edge, in the order
   * they were provided. Returns the margin required to fit all of them */
  private _layoutAxes (): Spacing {
    const margin = { top: 0, bottom: 0, left: 0, right: 0 }
    // Distance from the chart edge to the outer edge of the axes placed so far on each side
    const stackEnd: Spacing = {}

    for (const axis of this.axes) {
      axis.preRender()
      const required = axis.getRequiredMargin()
      const side = getAxisSide(axis.config) as keyof Spacing
      const [inward, outward] = axis.getCrossExtent()
      const end = stackEnd[side]
      // The first axis on a side sits on the chart edge. The next ones keep a gap from the axis inside them,
      // which their labels reaching towards the chart (e.g. rotated tick labels) must not cross
      const offset = end === undefined ? 0 : end + AXES_STACK_GAP_PX + inward
      axis.setOffset(offset)
      stackEnd[side] = offset + outward

      // On its own side the first axis needs the margin it requires alone, and the stacked ones extend it to their
      // outer edge. On the other sides (the bleed of its tick labels) the largest requirement among the axes wins
      for (const key of Object.keys(margin) as (keyof Spacing)[]) {
        const m = (key !== side ? required[key] : end === undefined ? required[side] : offset + outward) ?? 0
        if (margin[key] < m) margin[key] = m
      }
    }

    return margin
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

  public destroy (): void {
    const { components, axes, config: { tooltip, crosshair, annotations } } = this
    super.destroy()

    for (const c of components) c?.destroy()
    tooltip?.destroy()
    crosshair?.destroy()
    annotations?.destroy()
    for (const axis of axes) axis.destroy()
  }
}
