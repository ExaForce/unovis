import { XYContainer, areArraysShallowEqual } from '@unovis/ts'
import type {
  Annotations,
  Axis,
  Crosshair,
  Tooltip,
  XYComponentCore,
  XYContainerConfigInterface,
} from '@unovis/ts'
import type { JSX, ParentProps } from 'solid-js'
import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  splitProps,
} from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { VisContainerContextProps } from '../../utils/context'
import { VisContainerContext } from '../../utils/context'
import { createTrigger } from '../../utils/trigger'
import { combineStyle } from '../../utils/combine-style'

export type VisXYContainerProps<Datum> = ParentProps<
  XYContainerConfigInterface<Datum> & {
    data?: Datum[]
    class?: string
    style?: JSX.CSSProperties
  }
>

export function VisXYContainer<Datum>(props: VisXYContainerProps<Datum>) {
  const [div, style, data, rest] = splitProps(
    props,
    ['children', 'class'],
    ['style'],
    ['data']
  )
  const [ref, setRef] = createSignal<HTMLDivElement>()
  const [chart, setChart] = createSignal<XYContainer<Datum>>()
  const [config, setConfig] = createStore<XYContainerConfigInterface<Datum>>({
    components: [],
    annotations: undefined,
    crosshair: undefined,
    tooltip: undefined,
  })
  // The container accepts several axes per type and stacks them in the order of their elements in the template
  const axes = new Map<Axis<Datum>, HTMLElement | undefined>()
  const sortAxes = (): Axis<Datum>[] => Array.from(axes)
    .sort(([, a], [, b]) => a && b ? ((a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1) : 0)
    .map(([axis]) => axis)
  let sortedAxes: Axis<Datum>[] = []
  const getAxes = (): Pick<XYContainerConfigInterface<Datum>, 'xAxis' | 'yAxis'> => {
    sortedAxes = sortAxes()
    const xAxis = sortedAxes.filter((a) => a.config.type === 'x')
    const yAxis = sortedAxes.filter((a) => a.config.type === 'y')
    // A single axis of a type is passed as is, several as an array
    return {
      xAxis: xAxis.length > 1 ? xAxis : xAxis[0],
      yAxis: yAxis.length > 1 ? yAxis : yAxis[0],
    }
  }
  const [track, dirty] = createTrigger()

  onMount(() => {
    const r = ref()
    if (r) setChart(new XYContainer(r, config, data.data))
  })

  // A keyed `<For>` moves the axis elements without registering them again, so their order gets re-read
  onMount(() => {
    const r = ref()
    if (!r) return
    const observer = new MutationObserver(() => {
      if (!areArraysShallowEqual(sortAxes(), sortedAxes)) dirty()
    })
    observer.observe(r, { childList: true })
    onCleanup(() => observer.disconnect())
  })

  onCleanup(() => chart()?.destroy())

  createEffect(
    on(
      () => data.data,
      (data) => {
        if (data !== undefined) chart()?.setData(data)
      }
    )
  )

  createEffect(() => {
    // track the changes
    track()
    chart()?.updateContainer({ ...config, ...getAxes(), ...rest })
  })

  const update: VisContainerContextProps['update'] = (key, value, element) => {
    setConfig(
      produce((c) => {
        switch (key) {
          case 'component':
            c.components = [
              ...(c.components as XYComponentCore<Datum>[]),
              value() as XYComponentCore<Datum>,
            ]
            break
          case 'axis':
            axes.set(value() as Axis<Datum>, element)
            dirty()
            break
          case 'crosshair':
            c.crosshair = value() as Crosshair<Datum>
            break
          case 'annotations':
            c.annotations = value() as Annotations
            break
          case 'tooltip':
            c.tooltip = value() as Tooltip
        }
      })
    )
  }

  const destroy: VisContainerContextProps['destroy'] = (key) => {
    setConfig(
      produce((c) => {
        switch (key) {
          case 'component':
            c.components = c.components?.filter((i) => !i.isDestroyed())
            break
          case 'axis':
            for (const axis of axes.keys()) if (axis.isDestroyed()) axes.delete(axis)
            dirty()
            break
          case 'crosshair':
            c.crosshair = undefined
            break
          case 'annotations':
            c.annotations = undefined
            break
          case 'tooltip':
            c.tooltip = undefined
        }
      })
    )
  }

  return (
    <VisContainerContext.Provider value={{ update, destroy, dirty }}>
      <div
        data-vis-xy-container
        ref={setRef}
        style={combineStyle(
          {
            display: 'block',
            position: 'relative',
            width: '100%',
          },
          style.style
        )}
        {...div}
      />
    </VisContainerContext.Provider>
  )
}
