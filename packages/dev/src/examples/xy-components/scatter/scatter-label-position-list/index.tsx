import React, { useState } from 'react'
import { VisXYContainer, VisScatter, VisAxis } from '@unovis/react'

import { randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Label Position Lists'
export const subTitle = 'Every label takes the first position where it fits'

type PointDatum = { x: number; y: number; size: number; label: string }

const data: PointDatum[] = Array.from({ length: 80 }, (_, i) => ({
  x: 10 * randomNumberGenerator(),
  y: 10 * randomNumberGenerator(),
  size: 8 + 40 * randomNumberGenerator() ** 3,
  label: `P${i + 1}`,
}))

const labelPositions: Record<string, string | string[]> = {
  bottom: 'bottom',
  sides: ['right', 'left'],
  centerOrSides: ['center', 'right', 'left'],
  centerOrTopBottom: ['center', 'top', 'bottom'],
}

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [labelPosition, setLabelPosition] = useState('centerOrSides')

  return (
    <>
      <label>labelPosition: <select value={labelPosition} onChange={e => setLabelPosition(e.target.value)}>
        {Object.entries(labelPositions).map(([key, value]) => <option key={key} value={key}>{JSON.stringify(value)}</option>)}
      </select></label>
      <VisXYContainer<PointDatum> data={data} height={500}>
        <VisScatter<PointDatum>
          x={d => d.x}
          y={d => d.y}
          size={d => d.size}
          label={d => d.label}
          labelPosition={labelPositions[labelPosition]}
          duration={props.duration}
        />
        <VisAxis type='x' duration={props.duration}/>
        <VisAxis type='y' duration={props.duration}/>
      </VisXYContainer>
    </>
  )
}
