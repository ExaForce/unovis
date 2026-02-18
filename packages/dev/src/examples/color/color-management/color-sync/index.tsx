import React, { useRef } from 'react'
import { scaleOrdinal } from 'd3-scale'
import { VisXYContainer, VisArea, VisAxis, VisTooltip, VisCrosshair, VisStackedBar, VisBulletLegend } from '@unovis/react'

import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'
import { TextAlign, UnovisColorScale } from '@unovis/ts'
import { CurveType } from '@unovis/ts/types/curve'

export const title = 'Color Synchronization'
export const subTitle = 'Multiple Charts'

const colorScale = scaleOrdinal<string | number, string>()
  .range(['#ff8CFD', '#126B7E', '#FF5450', '#23cc00', '#0000FF', '#FFFF00'])

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  type Datum = { x: number; azure: number; aws: number; google: number; github: number; apple: number };
  const data: Datum[] = Array(75).fill(0).map((_, i) => {
    const t = i / 15
    return {
      x: i,
      azure: 80 + 15 * Math.sin(t) * t + i * 2,
      aws: 150 + 80 * Math.sin(t * 0.7) + i * 1.5,
      google: 200 + 60 * Math.cos(t * 1.2) + i * 3,
      github: 90 + 40 * Math.sin(t * 2) + i * 0.8,
      apple: 120 + 70 * Math.cos(t * 0.5 + 1) + i * 2.2,
    }
  })

  const areaChartKeys = ['azure', 'aws', 'github']
  const accessorsAreaChart = areaChartKeys.map(key => (d: Datum) => d[key as keyof Datum])

  const stackedBarChartKeys = ['aws', 'google', 'github', 'apple']
  const accessorsStackedBarChart = stackedBarChartKeys.map(key => (d: Datum) => d[key as keyof Datum])

  const colorMap = {
    azure: '#123456',
  } as Record<string, string>

  return (
    <>
      <VisBulletLegend
        items={[{ name: 'Azure', colorKey: 'azure' }, { name: 'AWS', colorKey: 'aws' }, { name: 'GitHub', colorKey: 'github' }]}
      />
      <VisXYContainer<Datum> data={data} margin={{ top: 5, left: 5 }} color={colorScale}>
        <VisArea
          x={d => d.x}
          y={accessorsAreaChart}
          duration={props.duration}
          colorKeys={areaChartKeys}
          color={(d: Datum[], i: number, key?: string) => {
            if (key && colorMap[key]) {
              return colorMap[key]
            }

            if (key && colorScale) {
              return colorScale(key)
            }

            return null
          }}
        />
        <VisAxis
          type='x'
          numTicks={10}
          tickTextHideOverlapping={true}
          tickTextAlign={(tick: number | Date, i: number, ticks: number[] | Date[], pos: [number, number], width: number) => {
            if (i === 0) return TextAlign.Left
            if (i === ticks.length - 1 && pos[0] > (width - 10)) return TextAlign.Right
            return TextAlign.Center
          }}
          tickFormat={(tick: number | Date, i: number, ticks: number[] | Date[]) => `${tick}ms`}
          duration={props.duration}
        />
        <VisAxis type='y' tickFormat={(y: number | Date, i: number, ticks: number[] | Date[]) => `${y}bps`} duration={props.duration}/>
      </VisXYContainer>
      <VisBulletLegend
        items={[{ name: 'AWS', colorKey: 'aws' }, { name: 'Google', colorKey: 'google' }, { name: 'GitHub', colorKey: 'github' }, { name: 'Apple', colorKey: 'apple' }]}
      />
      <VisXYContainer<Datum> data={data} margin={{ top: 5, left: 5 }}>
        <VisStackedBar x={d => d.x} y={accessorsStackedBarChart} duration={props.duration} colorKeys={stackedBarChartKeys} barPadding={0.05}/>
        <VisAxis type='x' numTicks={3} tickFormat={(tick: number | Date, i: number, ticks: number[] | Date[]) => `${tick}ms`} duration={props.duration}/>
        <VisAxis type='y' tickFormat={(tick: number | Date, i: number, ticks: number[] | Date[]) => `${tick}bps`} duration={props.duration}/>
      </VisXYContainer>
    </>
  )
}
