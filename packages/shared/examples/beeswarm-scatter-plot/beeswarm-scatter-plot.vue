<script setup lang="ts">
import { Scatter } from '@unovis/ts'
import { VisAxis, VisScatter, VisTooltip, VisXYContainer } from '@unovis/vue'
import type { MajorRecord } from './data'
import { categories, categoryColor, data, formatSalary, tooltip } from './data'

// Points with close salaries move apart vertically, but stay within 0.45 of a row from its center
const x = (d: MajorRecord) => d.medianSalary
const y = (d: MajorRecord) => categories.indexOf(d.category)
const size = (d: MajorRecord) => d.graduates

const triggers = {
  [Scatter.selectors.point]: tooltip,
}

const yDomain: [number, number] = [-0.5, categories.length - 0.5]
const yTickValues = categories.map((_, i) => i)
const yTickFormat = (tick: number | Date) => categories[+tick]
</script>

<template>
  <h3>Median Salary of College Majors</h3>
  <VisXYContainer :data :height="600" :yDomain>
    <VisScatter :x :y :size :sizeRange="[6, 40]" :color="categoryColor" spreadAxis="y" :spreadMax="0.45" />
    <VisTooltip :triggers />
    <VisAxis type="x" label="Median salary" :tickFormat="formatSalary" />
    <VisAxis type="y" :tickValues="yTickValues" :tickFormat="yTickFormat" />
  </VisXYContainer>
</template>
