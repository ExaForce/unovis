import React, { useState } from 'react'
import { VisXYContainer, VisScatter, VisAxis, VisTooltip, VisCrosshair } from '@unovis/react'
import { CrosshairSnapMode, Scale, Scatter } from '@unovis/ts'

import { randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Spread Points'
export const subTitle = 'Beeswarm over categories'

type TopicDatum = { category: number; topic: string; count: number }

const categories = ['Work', 'Personal', 'Uncertain']
const topics = [
  [
    'Coding', 'Debugging', 'Code review', 'Emails', 'SQL queries', 'Documentation', 'Meeting notes', 'Data analysis',
    'Slides', 'Spreadsheets', 'Unit tests', 'Refactoring', 'API design', 'Kubernetes', 'Terraform', 'Security review',
    'Incident response', 'Log analysis', 'Regex', 'Shell scripts', 'Git', 'CI pipelines', 'Performance', 'Architecture',
    'Product specs', 'Job descriptions', 'Interview prep', 'Customer support', 'Sales outreach', 'Marketing copy',
    'Legal review', 'Contracts', 'Translation', 'Research', 'Onboarding', 'Release notes',
  ],
  [
    'Travel', 'Recipes', 'Health', 'Shopping', 'Fitness', 'Personal finance', 'Gifts', 'Parenting', 'Home repair',
    'Gardening', 'Movies', 'Books', 'Music', 'Games', 'Pets', 'Language learning', 'Relationships', 'Cars', 'Fashion',
    'Photography', 'Taxes', 'Real estate', 'Hobbies', 'Events',
  ],
  ['Writing', 'Learning', 'Brainstorming', 'Summaries', 'Math', 'History', 'Science', 'Philosophy', 'Trivia', 'Poetry'],
]
const maxCounts = [2800, 900, 80]

// A long tail of topics in every category: a few large counts and many small, often equal ones
const data: TopicDatum[] = topics.flatMap((names, category) => names.map((topic, i) => ({
  category,
  topic,
  count: Math.max(1, Math.round(maxCounts[category] * (0.8 + 0.4 * randomNumberGenerator()) / (i + 1) ** 1.6)),
})))

// With a list of positions every label takes the first one where it fits: inside the point if it's readable there,
// otherwise on whichever side is free
const labelModes: Record<string, { label: (d: TopicDatum) => string | undefined; position: string | string[] }> = {
  fallback: { label: d => d.topic, position: ['center', 'right', 'left'] },
  right: { label: d => d.topic, position: 'right' },
  center: { label: d => d.count >= 300 ? `${d.count}` : undefined, position: 'center' },
}

const color = (d: TopicDatum): string => `var(--vis-color${d.category})`
const tooltip = (d: TopicDatum): string => `${categories[d.category]} · ${d.topic}: ${d.count}`

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [isSpread, setIsSpread] = useState(true)
  const [spreadMax, setSpreadMax] = useState(0.45)
  const [labelMode, setLabelMode] = useState('fallback')
  const [snapMode, setSnapMode] = useState<'' | `${CrosshairSnapMode}`>(CrosshairSnapMode.XY)

  return (
    <>
      <label>Spread: <input type='checkbox' checked={isSpread} onChange={() => setIsSpread(!isSpread)}/></label>
      <div><code>spreadMax: {spreadMax}</code></div>
      <input type='range' min={0.05} max={0.5} step={0.05} value={spreadMax} onChange={e => setSpreadMax(Number(e.target.value))}/>
      <div>
        <label>Labels: <select value={labelMode} onChange={e => setLabelMode(e.target.value)}>
          <option value='fallback'>Names inside, on the right or on the left, wherever they fit</option>
          <option value='right'>Names on the right</option>
          <option value='center'>Counts inside the large points</option>
          <option value=''>None</option>
        </select></label>
      </div>
      <div>
        <label>Crosshair: <select value={snapMode} onChange={e => setSnapMode(e.target.value as typeof snapMode)}>
          <option value={CrosshairSnapMode.XY}>Snapping to the point under the pointer</option>
          <option value={CrosshairSnapMode.X}>Snapping along X</option>
          <option value=''>None</option>
        </select></label>
      </div>
      <VisXYContainer<TopicDatum> data={data} xDomain={[-0.5, categories.length - 0.5]} yScale={Scale.scaleLog()} height={500}>
        <VisScatter<TopicDatum>
          x={d => d.category}
          y={d => d.count}
          size={d => d.count}
          sizeRange={[4, 90]}
          color={color}
          label={labelModes[labelMode]?.label}
          labelPosition={labelModes[labelMode]?.position}
          spreadAxis={isSpread ? 'x' : undefined}
          spreadMax={spreadMax}
          duration={props.duration}
        />
        <VisAxis
          type='x'
          tickValues={categories.map((_, i) => i)}
          tickFormat={(tick: number | Date) => categories[+tick]}
          gridLine={false}
          duration={props.duration}
        />
        <VisAxis type='y' label='Chats' tickValues={[1, 3, 10, 30, 100, 300, 1000]} duration={props.duration}/>
        {snapMode && <VisCrosshair<TopicDatum> snapMode={snapMode} showHorizontalLine color={color} template={tooltip}/>}
        <VisTooltip triggers={snapMode ? {} : { [Scatter.selectors.point]: tooltip }}/>
      </VisXYContainer>
    </>
  )
}
