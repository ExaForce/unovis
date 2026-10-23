import React from 'react'
import { VisXYContainer, VisStackedBar, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/react'

import { XYDataRecord, generateXYDataRecords } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Multiple Axes'
export const subTitle = 'Axes stacked per side, bound to named scales'

const data = generateXYDataRecords(30)
const colors = { volume: '#4D8CFD', share: '#FF6B7E', latency: '#A0B4D4' }

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  return (
    <VisXYContainer<XYDataRecord>
      data={data}
      height={450}
      yScales={{ share: { domain: [0, 100] } }}
    >
      <VisStackedBar<XYDataRecord> x={d => d.x} y={d => d.y * 100} color={colors.volume} duration={props.duration}/>
      <VisLine<XYDataRecord> x={d => d.x} y={d => 60 + 10 * (d.y1 ?? 0)} color={colors.share} yScaleKey='share' duration={props.duration}/>
      <VisLine<XYDataRecord> x={d => d.x} y={d => 20 + 150 * (d.y2 ?? 0)} color={colors.latency} yScaleKey='latency' duration={props.duration}/>

      {/* Primary Y scale: the innermost left axis */}
      <VisAxis type='y' label='Volume' tickFormat={(y: number | Date) => `${y}`} tickTextColor={colors.volume} labelColor={colors.volume} duration={props.duration}/>
      {/* A second left axis, stacked outwards, bound to the `latency` scale */}
      <VisAxis
        type='y'
        yScaleKey='latency'
        label='Latency'
        tickFormat={(y: number | Date) => `${y}ms`}
        gridLine={false}
        tickTextColor={colors.latency}
        labelColor={colors.latency}
        duration={props.duration}
      />
      {/* A right axis bound to the `share` scale, which has a pinned domain */}
      <VisAxis
        type='y'
        yScaleKey='share'
        position='right'
        label='Share'
        tickFormat={(y: number | Date) => `${y}%`}
        gridLine={false}
        tickTextColor={colors.share}
        labelColor={colors.share}
        duration={props.duration}
      />

      {/* Two X axes at the bottom showing the same scale in different units */}
      <VisAxis type='x' label='Time' tickFormat={(x: number | Date) => `${x}s`} duration={props.duration}/>
      <VisAxis type='x' tickFormat={(x: number | Date) => `${+x * 1000}ms`} gridLine={false} domainLine={false} tickLine={false} duration={props.duration}/>
      {/* And one at the top */}
      <VisAxis type='x' position='top' label='Sample' tickFormat={(x: number | Date) => `#${x}`} gridLine={false} duration={props.duration}/>

      <VisCrosshair template={(d: XYDataRecord) => `${d.x}s`} color={(d: XYDataRecord, i: number) => [colors.volume, colors.share, colors.latency][i]}/>
      <VisTooltip/>
    </VisXYContainer>
  )
}
