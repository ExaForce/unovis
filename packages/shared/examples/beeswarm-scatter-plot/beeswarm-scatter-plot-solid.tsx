import { JSX } from 'solid-js'
import { VisAxis, VisScatter, VisTooltip, VisXYContainer } from '@unovis/solid'
import { Scatter } from '@unovis/ts'

import { categories, categoryColor, data, formatSalary, MajorRecord, tooltip } from './data'

const BeeswarmScatterPlot = (): JSX.Element => {
  const x = (d: MajorRecord): number => d.medianSalary
  const y = (d: MajorRecord): number => categories.indexOf(d.category)
  const size = (d: MajorRecord): number => d.graduates

  return (
    <div>
      <h3>Median Salary of College Majors</h3>
      <VisXYContainer data={data} height={600} yDomain={[-0.5, categories.length - 0.5]}>
        {/* Points with close salaries move apart vertically, but stay within 0.45 of a row from its center */}
        <VisScatter
          x={x}
          y={y}
          size={size}
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
    </div>
  )
}

export default BeeswarmScatterPlot
