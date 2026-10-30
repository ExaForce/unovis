import React from 'react'
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip, VisCrosshair } from '@unovis/react'
import { CrosshairSnapMode } from '@unovis/ts'

import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Crosshair over Stacked Bars'
export const subTitle = 'Snapping to a whole column in the XY mode'

type QuarterDatum = { quarter: number; new: number; returning: number; churned: number }

const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026']
const series = [
  { name: 'New users', value: (d: QuarterDatum) => d.new },
  { name: 'Returning users', value: (d: QuarterDatum) => d.returning },
  { name: 'Churned users', value: (d: QuarterDatum) => d.churned },
]

// Tall segments at the bottom (Q3 2025), in the middle (Q4 2025) and below zero (Q1 2026)
const data: QuarterDatum[] = [[40, 25, -10], [55, 30, -15], [180, 40, -20], [60, 120, -25], [70, 45, -90], [30, 20, -10]]
  .map(([newUsers, returning, churned], quarter) => ({ quarter, new: newUsers, returning, churned }))

const template = (d: QuarterDatum): string => `${quarters[d.quarter]}: ${series.map(s => `${s.name} ${s.value(d)}`).join(', ')}`

export const component = (props: ExampleViewerDurationProps): React.ReactNode => (
  <VisXYContainer<QuarterDatum> data={data} height={400}>
    <VisStackedBar<QuarterDatum> x={d => d.quarter} y={series.map(s => s.value)} duration={props.duration}/>
    <VisAxis type='x' tickValues={quarters.map((_, i) => i)} tickFormat={(i: number) => quarters[i]} gridLine={false} duration={props.duration}/>
    <VisAxis type='y' label='Thousands of users' duration={props.duration}/>
    <VisCrosshair<QuarterDatum> snapMode={CrosshairSnapMode.XY} showHorizontalLine template={template}/>
    <VisTooltip/>
  </VisXYContainer>
)
