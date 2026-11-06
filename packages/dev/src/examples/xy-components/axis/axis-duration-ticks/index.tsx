import React from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { VisXYContainer, VisAxis, VisLine } from '@unovis/react'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'
import { DURATION_DAY, DURATION_HOUR, DURATION_MINUTE, DURATION_SECOND, DURATION_WEEK, DurationUnit, scaleDuration } from '@unovis/ts'

export const title = 'Duration Ticks'
export const subTitle = 'Whole milliseconds to weeks with scaleDuration'

const durationUnits: [string, number][] = [['d', DURATION_DAY], ['h', DURATION_HOUR], ['m', DURATION_MINUTE]]

const formatDuration = (tick: number | Date, i: number, ticks: (number | Date)[]): string => {
  const ms = Math.abs(+tick)
  const step = ticks.length > 1 ? Math.abs(+ticks[1] - +ticks[0]) : 0
  if (ms === 0) return '0'
  if (ms < DURATION_SECOND) return `${+tick}ms`
  if (step && step % DURATION_WEEK === 0) return `${+tick / DURATION_WEEK}w`

  let rest = ms
  const parts = durationUnits.map(([unit, size]) => {
    const value = Math.floor(rest / size)
    rest -= value * size
    return value ? `${value}${unit}` : ''
  })
  if (rest) parts.push(`${rest / DURATION_SECOND}s`)
  return `${+tick < 0 ? '-' : ''}${parts.filter(Boolean).join(' ')}`
}

const timeTickFormat = scaleTime().tickFormat() as (tick: number | Date) => string

type LatencyDatum = { time: number; latency: number }

const start = +new Date(2026, 9, 1, 12)
const latencyData: LatencyDatum[] = Array.from({ length: 61 }, (_, i) => ({
  time: start + i * DURATION_MINUTE,
  latency: (150 + 120 * Math.sin(i / 6) + 30 * Math.sin(i * 1.7)) * DURATION_SECOND,
}))

const latencyCharts = [
  { label: 'Latency, linear Y scale', yScale: scaleLinear() },
  { label: 'Latency, scaleDuration()', yScale: scaleDuration() },
]

type AxisExample = {
  label: string;
  domain: [number, number];
  maxUnit?: DurationUnit;
}

const axes: AxisExample[] = [
  { label: '0–300 seconds', domain: [0, 300 * DURATION_SECOND] },
  { label: '0–137 seconds', domain: [0, 137 * DURATION_SECOND] },
  { label: '0–1.5 seconds', domain: [0, 1.5 * DURATION_SECOND] },
  { label: '0–40 minutes', domain: [0, 40 * DURATION_MINUTE] },
  { label: '0–5 hours', domain: [0, 5 * DURATION_HOUR] },
  { label: '0–3 days', domain: [0, 3 * DURATION_DAY] },
  { label: '0–90 days', domain: [0, 90 * DURATION_DAY] },
  { label: '0–1 year', domain: [0, 365 * DURATION_DAY] },
  { label: '0–1 year, maxUnit(DurationUnit.Day)', domain: [0, 365 * DURATION_DAY], maxUnit: DurationUnit.Day },
  { label: '−2…5 minutes', domain: [-2 * DURATION_MINUTE, 5 * DURATION_MINUTE] },
]

const labelStyle: React.CSSProperties = { font: '11px monospace', color: '#888', margin: '12px 0 2px' }

export const component = (props: ExampleViewerDurationProps): React.ReactNode => (
  <>
    <div style={{ display: 'flex', gap: 24 }}>
      {latencyCharts.map(chart => (
        <div key={chart.label} style={{ flex: 1, minWidth: 0 }}>
          <div style={labelStyle}>{chart.label}</div>
          <VisXYContainer<LatencyDatum> data={latencyData} height={240} xScale={scaleTime()} yScale={chart.yScale}>
            <VisLine<LatencyDatum> x={d => d.time} y={d => d.latency} duration={props.duration} />
            <VisAxis type='x' tickFormat={timeTickFormat} duration={props.duration} />
            <VisAxis type='y' tickFormat={formatDuration} duration={props.duration} />
          </VisXYContainer>
        </div>
      ))}
    </div>
    {axes.map(axis => (
      <div key={axis.label}>
        <div style={labelStyle}>{axis.label} — linear, then duration</div>
        <VisXYContainer xDomain={axis.domain} height={40}>
          <VisAxis
            type='x'
            tickTextAdaptiveSets={true}
            tickTextHideOverlapping={true}
            tickFormat={formatDuration}
            duration={props.duration}
          />
        </VisXYContainer>
        <VisXYContainer xDomain={axis.domain} height={40} xScale={scaleDuration().maxUnit(axis.maxUnit ?? DurationUnit.Week)}>
          <VisAxis
            type='x'
            tickTextAdaptiveSets={true}
            tickTextHideOverlapping={true}
            tickFormat={formatDuration}
            duration={props.duration}
          />
        </VisXYContainer>
      </div>
    ))}
  </>
)
