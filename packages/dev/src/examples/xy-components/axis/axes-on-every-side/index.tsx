import React from 'react'
import { Scale } from '@unovis/ts'
import { VisXYContainer, VisStackedBar, VisLine, VisScatter, VisAxis, VisCrosshair, VisTooltip } from '@unovis/react'

import { randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Axes on Every Side'
export const subTitle = 'Stress test: three left, three right, two top, three bottom'

type MetricsRecord = {
  timestamp: number;
  cpu: number;
  memory: number;
  temperature: number;
  requests: number;
  latency: number;
  errors: number;
}

const start = Date.UTC(2026, 9, 22, 8)
const step = 30 * 60 * 1000
const data: MetricsRecord[] = Array(48).fill(0).map((_, i) => ({
  timestamp: start + i * step,
  cpu: 35 + 30 * randomNumberGenerator() + 15 * Math.sin(i / 5),
  memory: 24 + 2 * randomNumberGenerator() + i / 4,
  temperature: 55 + 10 * randomNumberGenerator() + 8 * Math.cos(i / 7),
  requests: 1500 + 2500 * randomNumberGenerator(),
  latency: 40 + 60 * randomNumberGenerator() + (i > 30 ? 120 : 0),
  errors: Math.round(20 * randomNumberGenerator() * (i > 30 ? 2 : 1)),
}))

const colors = {
  cpu: '#4D8CFD',
  memory: '#FF6B7E',
  temperature: '#F4B740',
  requests: '#7B8DB0',
  latency: '#A0B4D4',
  errors: '#E2203A',
}

const formatTime = (t: number | Date): string => new Date(t).toISOString().slice(11, 16)
const formatDate = (t: number | Date): string => new Date(t).toUTCString().slice(0, 16)

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  return (
    <VisXYContainer<MetricsRecord>
      data={data}
      height={560}
      xScale={Scale.scaleTime()}
      xScales={{
        progress: { domain: [0, 100] },
        sample: { domain: [0, data.length - 1] },
      }}
      yScales={{
        cpu: { domain: [0, 100] },
        errors: { domain: [0, undefined] },
      }}
    >
      {/* One component per unit, every one bound to a scale of its own */}
      <VisStackedBar<MetricsRecord> x={d => d.timestamp} y={d => d.requests} yScaleKey='requests' color={colors.requests} barPadding={0.4} duration={props.duration}/>
      <VisLine<MetricsRecord> x={d => d.timestamp} y={d => d.cpu} yScaleKey='cpu' color={colors.cpu} duration={props.duration}/>
      <VisLine<MetricsRecord> x={d => d.timestamp} y={d => d.memory} yScaleKey='memory' color={colors.memory} duration={props.duration}/>
      <VisLine<MetricsRecord> x={d => d.timestamp} y={d => d.temperature} yScaleKey='temperature' color={colors.temperature} excludeFromCrosshair duration={props.duration}/>
      <VisLine<MetricsRecord> x={d => d.timestamp} y={d => d.latency} yScaleKey='latency' color={colors.latency} lineDashArray={[4, 4]} duration={props.duration}/>
      <VisScatter<MetricsRecord> x={d => d.timestamp} y={d => d.errors} yScaleKey='errors' color={colors.errors} size={6} excludeFromCrosshair duration={props.duration}/>

      {/* Left: CPU (innermost), memory, temperature */}
      <VisAxis
        type='y'
        yScaleKey='cpu'
        label='CPU'
        tickFormat={(y: number | Date) => `${y}%`}
        tickTextColor={colors.cpu}
        labelColor={colors.cpu}
        duration={props.duration}
      />
      <VisAxis
        type='y'
        yScaleKey='memory'
        label='Memory'
        tickFormat={(y: number | Date) => `${(+y).toFixed(1)} GB`}
        tickTextAlign='right'
        gridLine={false}
        tickTextColor={colors.memory}
        labelColor={colors.memory}
        duration={props.duration}
      />
      <VisAxis
        type='y'
        yScaleKey='temperature'
        label='Temperature'
        tickFormat={(y: number | Date) => `${y}°C`}
        numTicks={4}
        gridLine={false}
        tickTextColor={colors.temperature}
        labelColor={colors.temperature}
        duration={props.duration}
      />

      {/* Right: requests (innermost), latency, errors */}
      <VisAxis
        type='y'
        position='right'
        yScaleKey='requests'
        label='Requests per second'
        tickFormat={(y: number | Date) => `${(+y / 1000).toFixed(1)}k`}
        gridLine={false}
        tickTextColor={colors.requests}
        labelColor={colors.requests}
        duration={props.duration}
      />
      <VisAxis
        type='y'
        position='right'
        yScaleKey='latency'
        label='Latency'
        tickFormat={(y: number | Date) => `${y} ms`}
        numTicks={4}
        gridLine={false}
        tickTextColor={colors.latency}
        labelColor={colors.latency}
        duration={props.duration}
      />
      <VisAxis
        type='y'
        position='right'
        yScaleKey='errors'
        label='Errors'
        minMaxTicksOnly
        gridLine={false}
        tickTextColor={colors.errors}
        labelColor={colors.errors}
        duration={props.duration}
      />

      {/* Bottom: time (innermost, primary scale), the elapsed time on the same scale with rotated labels,
          and a progress scale that no component is bound to */}
      <VisAxis type='x' label='Time (UTC)' tickFormat={formatTime} tickTextHideOverlapping duration={props.duration}/>
      <VisAxis
        type='x'
        tickFormat={(t: number | Date) => `+${Math.round((+t - start) / 60000)} min`}
        tickTextAngle={-30}
        tickTextHideOverlapping
        gridLine={false}
        domainLine={false}
        tickLine={false}
        duration={props.duration}
      />
      <VisAxis type='x' xScaleKey='progress' label='Progress' tickFormat={(x: number | Date) => `${x}%`} tickTextHideOverlapping gridLine={false} duration={props.duration}/>

      {/* Top: the sample index on a scale of its own, and the date on the primary scale */}
      <VisAxis type='x' position='top' xScaleKey='sample' label='Sample' tickFormat={(x: number | Date) => `#${x}`} tickTextHideOverlapping gridLine={false} duration={props.duration}/>
      <VisAxis type='x' position='top' tickFormat={formatDate} minMaxTicksOnly tickTextHideOverlapping gridLine={false} duration={props.duration}/>

      {/* The circles follow the components not excluded from the crosshair: the stacked bars first, then the lines */}
      <VisCrosshair
        template={(d: MetricsRecord) => `${formatTime(d.timestamp)}: ${d.cpu.toFixed(0)}% CPU, ${d.latency.toFixed(0)} ms`}
        color={(d: MetricsRecord, i: number) => [colors.requests, colors.cpu, colors.memory, colors.latency][i]}
      />
      <VisTooltip/>
    </VisXYContainer>
  )
}
