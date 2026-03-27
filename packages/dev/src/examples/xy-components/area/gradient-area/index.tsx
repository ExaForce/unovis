import React, { useMemo, useRef } from 'react'
import { VisXYContainer, VisArea, VisAxis, VisTooltip, VisCrosshair } from '@unovis/react'

import { TimeSeriesDataRecord, generateTimeSeriesDataRecords } from '@src/utils/data'
import { formatDateTimeLabel } from '@src/utils/format'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'
import { Scale } from '@unovis/ts'

export const title = 'Gradient Area Chart'
export const subTitle = 'Generated Data'

const numSeries = 5
// const colors = ['#7aa2f7', '#bb9af7', '#7dcfff', '#9ece6a', '#ff9e64', '#f7768e', '#2ac3de', '#e0af68', '#b4f9f8', '#c0caf5']
// const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#c2410c', '#7e22ce', '#0f766e']
// const colors = ['#6c8ebf', '#82b366', '#d6a04a', '#ae7dcb', '#d07070', '#5da8a0', '#c9a66b', '#7b9ec9', '#9fc98e', '#c97b8a']
// const colors = ['#00f5ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b', '#3a86ff', '#06d6a0', '#ff4d6d', '#c77dff', '#4cc9f0']
// const colors = ['#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8', '#3a0ca3', '#3f37c9', '#4361ee', '#4895ef', '#4cc9f0']

const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#14b8a6', '#8b5cf6', '#fb923c', '#ec4899', '#10b981', '#6366f1', '#facc15', '#22c55e', '#06b6d4', '#a855f7', '#d946ef']
// ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
const svgDefs = colors.slice(0, numSeries).map((color, i) => `
  <linearGradient id="gradient-${i}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity="0.4" />
    <stop offset="100%" stop-color="${color}" stop-opacity="0.02" />
  </linearGradient>`).join('')

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const tooltipRef = useRef(null)
  const accessors = Array.from({ length: numSeries }, (_, i) => (d: TimeSeriesDataRecord) => d.values[i])
  const gradientColors = colors.slice(0, numSeries).map((_, i) => `url(#gradient-${i})`)
  const data = generateTimeSeriesDataRecords(numSeries, 35)

  const xTimeRangeScale = useMemo(() => Scale.scaleTime(), [])

  return (
    <VisXYContainer<TimeSeriesDataRecord>
      data={data}
      margin={{ top: 5, left: 5 }}
      xScale={xTimeRangeScale}
      svgDefs={svgDefs}
      style={{
        '--vis-tooltip-padding': '3px 6px',
        '--vis-crosshair-line-stroke-color': '#aac',
        '--vis-font-family': 'Bricolage Grotesque',
        fontFamily: 'Bricolage Grotesque',
        lineHeight: 1,
      }}
    >
      <VisArea
        x={d => d.time}
        y={accessors}
        duration={props.duration}
        color={gradientColors}
        line={true}
        lineWidth={1}
        lineColor={colors.slice(0, numSeries)}
      />
      <VisAxis
        type='x'
        numTicks={5}
        tickFormat={(x: number | Date, i: number, ticks: number[] | Date[]) => formatDateTimeLabel(x, i, ticks)}
        duration={props.duration}
      />
      <VisAxis
        type='y'
        label="Value"
        gridLine={false}
        duration={props.duration}
        tickSize={3}
      />
      <VisCrosshair
        color={colors.slice(0, numSeries)}
        template={(d: TimeSeriesDataRecord) =>
          `<span style="color: grey; font-size: 12px;">${new Date(d.time).toLocaleTimeString()}</span>`} />
      <VisTooltip ref={tooltipRef}/>
    </VisXYContainer>
  )
}
