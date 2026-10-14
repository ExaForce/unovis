import { Axis, Scatter, Tooltip, XYContainer } from '@unovis/ts'

import { categories, categoryColor, data, formatSalary, MajorRecord, tooltip } from './data'

const container = document.getElementById('vis-container')

const title = document.createElement('h3')
title.innerText = 'Median Salary of College Majors'
container.append(title)

// Points with close salaries move apart vertically, but stay within 0.45 of a row from its center
const scatter = new Scatter<MajorRecord>({
  x: d => d.medianSalary,
  y: d => categories.indexOf(d.category),
  size: d => d.graduates,
  sizeRange: [6, 40],
  color: categoryColor,
  spreadAxis: 'y',
  spreadMax: 0.45,
})

const chart = new XYContainer(container, {
  height: 600,
  yDomain: [-0.5, categories.length - 0.5],
  components: [scatter],
  xAxis: new Axis<MajorRecord>({
    label: 'Median salary',
    tickFormat: formatSalary,
  }),
  yAxis: new Axis<MajorRecord>({
    tickValues: categories.map((_, i) => i),
    tickFormat: (tick: number | Date) => categories[+tick],
  }),
  tooltip: new Tooltip({
    triggers: {
      [Scatter.selectors.point]: tooltip,
    },
  }),
}, data)
