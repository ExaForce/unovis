import React, { useState } from 'react'
import { VisXYContainer, VisScatter, VisAxis, VisTooltip, VisCrosshair } from '@unovis/react'
import { CrosshairSnapMode, Scale, Scatter } from '@unovis/ts'

import { randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Spread Timeline'
export const subTitle = 'Events spread vertically along time'

type EventDatum = { timestamp: number; severity: number }

const severities = ['Low', 'Medium', 'High']
const colors = ['var(--vis-color0)', 'var(--vis-color2)', 'var(--vis-color1)']
const start = Date.UTC(2026, 9, 1)
const hour = 60 * 60 * 1000

// Bursts of events around a few moments of the day
const burstHours = [3, 9.5, 10.5, 14, 20]
const data: EventDatum[] = Array.from({ length: 400 }, (_, i) => {
  const spread = 1.5 * (randomNumberGenerator() + randomNumberGenerator() + randomNumberGenerator() - 1.5)
  return {
    timestamp: Math.round(start + (burstHours[i % burstHours.length] + spread) * hour),
    severity: Math.floor(3 * randomNumberGenerator() ** 2),
  }
})

const color = (d: EventDatum): string => colors[d.severity]
const tooltip = (d: EventDatum): string => `${severities[d.severity]}, ${new Date(d.timestamp).toUTCString()}`

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [snapMode, setSnapMode] = useState<'' | `${CrosshairSnapMode}`>(CrosshairSnapMode.XY)

  return (
    <>
      <label>Crosshair: <select value={snapMode} onChange={e => setSnapMode(e.target.value as typeof snapMode)}>
        <option value={CrosshairSnapMode.XY}>Snapping to the point under the pointer</option>
        <option value={CrosshairSnapMode.X}>Snapping along time</option>
        <option value=''>None</option>
      </select></label>
      <VisXYContainer<EventDatum> data={data} xScale={Scale.scaleTime()} yDomain={[-1, 1]} height={300}>
        <VisScatter<EventDatum>
          x={d => d.timestamp}
          y={0}
          size={8}
          color={color}
          spreadAxis='y'
          duration={props.duration}
        />
        <VisAxis type='x' tickFormat={(tick: number | Date) => new Date(tick).toISOString().slice(11, 16)} duration={props.duration}/>
        {snapMode && <VisCrosshair<EventDatum> snapMode={snapMode} color={color} template={tooltip}/>}
        <VisTooltip triggers={snapMode ? {} : { [Scatter.selectors.point]: tooltip }}/>
      </VisXYContainer>
    </>
  )
}
