<script lang="ts">
  import { XYContainer } from '@unovis/ts/containers/xy-container'
  import type { XYContainerConfigInterface } from '@unovis/ts/containers/xy-container/config'
  import type { XYComponentCore } from '@unovis/ts/core/xy-component'
  import type { Tooltip } from '@unovis/ts/components/tooltip'
  import type { Crosshair } from '@unovis/ts/components/crosshair'
  import type { Axis } from '@unovis/ts/components/axis'
  import type { Annotations } from '@unovis/ts/components/annotations'
  import { areArraysShallowEqual, flatten } from '@unovis/ts/utils/data'
  import { onMount, setContext } from 'svelte'

  type Datum = $$Generic
  interface $$Props extends XYContainerConfigInterface<Datum> {
    data?: Datum[];
  }

  // Props
  export let data: Datum[] = undefined
  export let className = ''
  /**
   * CSS class string. Requires `:global` modifier to take effect. _i.e._
   * ```css
   * div :global(.chart) { }
   * ```
   * @example
   * <div>
   *     <VisXYContainer class='chart'>
   *        ...
   *     <VisXYContainer>
   * </div>
   *
   * @see {@link https://svelte.dev/docs/svelte-components#styles}
  */
  export { className as class }

  let chart: XYContainer<Datum>
  const config: XYContainerConfigInterface<Datum> = {
    components: [],
    crosshair: undefined,
    tooltip: undefined,
    xAxis: undefined,
    yAxis: undefined,
    annotations: undefined,
  }
  let ref: HTMLDivElement

  $: if (data !== undefined) chart?.setData(data)

  let animationFrame = 0
  const updateContainer = (): void => {
    // due to the order of events when a component is removed update container can be called
    // while a component is being destroyed. This can lead to an error because we trigger an update
    // with a destroyed component.
    config.components = config.components?.filter((e) => !e.isDestroyed())

    // we can't use animation frames in a non-browser environment
    if (typeof requestAnimationFrame === 'undefined') {
      chart?.updateContainer({
        ...config,
        ...($$restProps as XYContainerConfigInterface<Datum>),
      })

      return
    }

    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }

    // this prevent multiple renders from happening in a single frame
    // when a component is first rendered the components will be pushed 1 by 1
    // so we don't want to rerender every time a component is added
    animationFrame = requestAnimationFrame(() => {
      chart?.updateContainer({
        ...config,
        ...($$restProps as XYContainerConfigInterface<Datum>),
      })
      animationFrame = 0
    })
  }

  $: {
    // Referencing `config` and `$$restProps` makes this reactive statement re-run when they change
    // eslint-disable-next-line no-unused-expressions
    config
    // eslint-disable-next-line no-unused-expressions
    $$restProps
    updateContainer()
  }

  onMount(() => {
    chart = new XYContainer(ref, config, data)
    return () => chart.destroy()
  })

  // Child components call this after updating their data or config, so the chart re-renders.
  // The render is scheduled on the next animation frame by the core, so multiple updates get batched
  setContext('dirty', () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    chart?.render()
  })

  setContext('component', () => ({
    update: (c: XYComponentCore<Datum>) => {
      if (config.components?.includes(c)) return
      config.components = [...config.components, c]
    },
    destroy: () => { config.components = config.components.filter(c => !c.isDestroyed()) },
  }))
  // The container accepts several axes per type and stacks them in the order of their elements in the template
  const axes = new Map<HTMLElement, Axis<Datum>>()
  const updateAxes = (): void => {
    const sorted = Array.from(axes)
      .sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1)
      .map(([, c]) => c)
    const xAxis = sorted.filter(c => c.config.type === 'x')
    const yAxis = sorted.filter(c => c.config.type === 'y')
    // A single axis of a type is passed as is, several as an array
    if (!areArraysShallowEqual(xAxis, flatten([config.xAxis ?? []]))) config.xAxis = xAxis.length > 1 ? xAxis : xAxis[0]
    if (!areArraysShallowEqual(yAxis, flatten([config.yAxis ?? []]))) config.yAxis = yAxis.length > 1 ? yAxis : yAxis[0]
  }
  // A keyed `{#each}` moves the axis elements without registering them again, so their order gets re-read
  onMount(() => {
    const observer = new MutationObserver(updateAxes)
    observer.observe(ref, { childList: true })
    return () => observer.disconnect()
  })
  setContext('axis', (e: HTMLElement) => ({
    update: (c: Axis<Datum>) => {
      axes.set(e, c)
      updateAxes()
    },
    destroy: () => {
      axes.delete(e)
      updateAxes()
    },
  }))
  setContext('crosshair', () => ({
    update: (c: Crosshair<Datum>) => {
      if (config.crosshair === c) return
      config.crosshair = c
    },
    destroy: () => { config.crosshair = undefined },
  }))
  setContext('tooltip', () => ({
    update: (t: Tooltip) => {
      if (config.tooltip === t) return
      config.tooltip = t
    },
    destroy: () => { config.tooltip = undefined },
  }))
  setContext('annotations', () => ({
    update: (a: Annotations) => {
      if (config.annotations === a) return
      config.annotations = a
    },
    destroy: () => { config.annotations = undefined },
  }))
</script>

<vis-xy-container bind:this={ref} class={`unovis-xy-container ${className}`}>
  <slot />
</vis-xy-container>


<style>
  .unovis-xy-container {
    display: block;
    position: relative;
    width: 100%;
  }
</style>
