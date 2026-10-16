import React, { useState } from 'react'
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip, VisCrosshair } from '@unovis/react'
import { CrosshairSnapMode } from '@unovis/ts'

import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Crosshair over Bars'
export const subTitle = 'Snapping to a bar or to a group'

type QuarterDatum = { quarter: number; revenue: number; costs: number; profit: number }

const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026']
const series = [
  { name: 'Revenue', value: (d: QuarterDatum) => d.revenue },
  { name: 'Costs', value: (d: QuarterDatum) => d.costs },
  { name: 'Profit', value: (d: QuarterDatum) => d.profit },
]

// A tiny profit in Q2 2025 makes `barMinHeight` stretch its bar, and a loss in Q3 2025 makes a negative one
const data: QuarterDatum[] = [[120, 95], [98, 97.6], [80, 104], [132, 101], [141, 109], [150, 112]]
  .map(([revenue, costs], quarter) => ({ quarter, revenue, costs, profit: Math.round((revenue - costs) * 10) / 10 }))

const template = (d: QuarterDatum, x: number | Date, data: QuarterDatum[], i: number, seriesIndex?: number): string =>
  seriesIndex === undefined
    ? `${quarters[d.quarter]}: ${series.map(s => `${s.name} ${s.value(d)}`).join(', ')}`
    : `${quarters[d.quarter]} · ${series[seriesIndex].name}: ${series[seriesIndex].value(d)}`

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [snapMode, setSnapMode] = useState<`${CrosshairSnapMode}`>(CrosshairSnapMode.XY)

  return (
    <>
      <label>Crosshair: <select value={snapMode} onChange={e => setSnapMode(e.target.value as typeof snapMode)}>
        <option value={CrosshairSnapMode.XY}>Snapping to the bar under the pointer</option>
        <option value={CrosshairSnapMode.X}>Snapping to the quarter</option>
      </select></label>
      <VisXYContainer<QuarterDatum> data={data} height={400}>
        <VisGroupedBar<QuarterDatum> x={d => d.quarter} y={series.map(s => s.value)} barMinHeight={4} duration={props.duration}/>
        <VisAxis type='x' tickValues={quarters.map((_, i) => i)} tickFormat={(i: number) => quarters[i]} gridLine={false} duration={props.duration}/>
        <VisAxis type='y' label='Thousands of dollars' duration={props.duration}/>
        <VisCrosshair<QuarterDatum> snapMode={snapMode} showHorizontalLine template={template}/>
        <VisTooltip/>
      </VisXYContainer>
    </>
  )
}
