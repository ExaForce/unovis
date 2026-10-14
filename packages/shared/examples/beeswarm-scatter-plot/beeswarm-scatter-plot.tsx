import React from 'react'
import { VisAxis, VisScatter, VisTooltip, VisXYContainer } from '@unovis/react'
import { Scatter } from '@unovis/ts'

import { categories, categoryColor, data, formatSalary, MajorRecord, tooltip } from './data'

export default function BeeswarmScatterPlot (): JSX.Element {
  return (
    <>
      <h3>Median Salary of College Majors</h3>
      <VisXYContainer<MajorRecord> data={data} height={600} yDomain={[-0.5, categories.length - 0.5]}>
        {/* Points with close salaries move apart vertically, but stay within 0.45 of a row from its center */}
        <VisScatter
          x={(d: MajorRecord) => d.medianSalary}
          y={(d: MajorRecord) => categories.indexOf(d.category)}
          size={(d: MajorRecord) => d.graduates}
          sizeRange={[6, 40]}
          color={categoryColor}
          spreadAxis="y"
          spreadMax={0.45}
        />
        <VisTooltip triggers={{ [Scatter.selectors.point]: tooltip }}/>
        <VisAxis type="x" label="Median salary" tickFormat={formatSalary}/>
        <VisAxis
          type="y"
          tickValues={categories.map((_, i) => i)}
          tickFormat={(tick: number | Date) => categories[+tick]}
        />
      </VisXYContainer>
    </>
  )
}
