import { Component } from '@angular/core'
import { Scatter } from '@unovis/ts'

import { categories, categoryColor, data, formatSalary, MajorRecord, tooltip } from './data'

@Component({
  selector: 'beeswarm-scatter-plot',
  templateUrl: './beeswarm-scatter-plot.component.html',
  standalone: false,
})
export class BeeswarmScatterPlotComponent {
  data = data
  yDomain: [number, number] = [-0.5, categories.length - 0.5]

  // Points with close salaries move apart vertically, but stay within 0.45 of a row from its center
  x = (d: MajorRecord): number => d.medianSalary
  y = (d: MajorRecord): number => categories.indexOf(d.category)
  size = (d: MajorRecord): number => d.graduates
  color = categoryColor

  triggers = {
    [Scatter.selectors.point]: tooltip,
  }

  // X Axis
  xTickFormat = formatSalary

  // Y Axis
  yTickValues = categories.map((_, i) => i)
  yTickFormat = (tick: number | Date): string => categories[+tick]
}
