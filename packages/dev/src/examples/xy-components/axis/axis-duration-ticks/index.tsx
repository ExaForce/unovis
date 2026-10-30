import React from 'react'
import { VisXYContainer, VisAxis, VisLine } from '@unovis/react'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'
import { DurationUnit, Scale } from '@unovis/ts'

export const title = 'Duration Ticks'
export const subTitle = 'Whole milliseconds to weeks with Scale.scaleDuration'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const durationUnits: [string, number][] = [['d', DAY], ['h', HOUR], ['m', MINUTE]]

const formatDuration = (tick: number | Date, i: number, ticks: (number | Date)[]): string => {
  const ms = Math.abs(+tick)
  const step = ticks.length > 1 ? Math.abs(+ticks[1] - +ticks[0]) : 0
  if (ms === 0) return '0'
  if (ms < SECOND) return `${+tick}ms`
  if (step && step % WEEK === 0) return `${+tick / WEEK}w`

  let rest = ms
  const parts = durationUnits.map(([unit, size]) => {
    const value = Math.floor(rest / size)
    rest -= value * size
    return value ? `${value}${unit}` : ''
  })
  if (rest) parts.push(`${rest / SECOND}s`)
  return `${+tick < 0 ? '-' : ''}${parts.filter(Boolean).join(' ')}`
}

const timeTickFormat = Scale.scaleTime().tickFormat() as (tick: number | Date) => string

type LatencyDatum = { time: number; latency: number }

const start = +new Date(2026, 9, 1, 12)
const latencyData: LatencyDatum[] = Array.from({ length: 61 }, (_, i) => ({
  time: start + i * MINUTE,
  latency: (150 + 120 * Math.sin(i / 6) + 30 * Math.sin(i * 1.7)) * SECOND,
}))

const latencyCharts = [
  { label: 'Latency, linear Y scale', yScale: Scale.scaleLinear() },
  { label: 'Latency, Scale.scaleDuration()', yScale: Scale.scaleDuration() },
]

type AxisExample = {
  label: string;
  domain: [number, number];
  maxUnit?: DurationUnit;
}

const axes: AxisExample[] = [
  { label: '0–300 seconds', domain: [0, 300 * SECOND] },
  { label: '0–137 seconds', domain: [0, 137 * SECOND] },
  { label: '0–1.5 seconds', domain: [0, 1.5 * SECOND] },
  { label: '0–40 minutes', domain: [0, 40 * MINUTE] },
  { label: '0–5 hours', domain: [0, 5 * HOUR] },
  { label: '0–3 days', domain: [0, 3 * DAY] },
  { label: '0–90 days', domain: [0, 90 * DAY] },
  { label: '0–1 year', domain: [0, 365 * DAY] },
  { label: '0–1 year, maxUnit(DurationUnit.Day)', domain: [0, 365 * DAY], maxUnit: DurationUnit.Day },
  { label: '−2…5 minutes', domain: [-2 * MINUTE, 5 * MINUTE] },
]

const labelStyle: React.CSSProperties = { font: '11px monospace', color: '#888', margin: '12px 0 2px' }

export const component = (props: ExampleViewerDurationProps): React.ReactNode => (
  <>
    <div style={{ display: 'flex', gap: 24 }}>
      {latencyCharts.map(chart => (
        <div key={chart.label} style={{ flex: 1, minWidth: 0 }}>
          <div style={labelStyle}>{chart.label}</div>
          <VisXYContainer<LatencyDatum> data={latencyData} height={240} xScale={Scale.scaleTime()} yScale={chart.yScale}>
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
        <VisXYContainer xDomain={axis.domain} height={40} xScale={Scale.scaleDuration().maxUnit(axis.maxUnit ?? DurationUnit.Week)}>
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
