import React, { useState } from 'react'
import { VisXYContainer, VisScatter, VisAxis, VisTooltip } from '@unovis/react'
import { Scale, Scatter } from '@unovis/ts'

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

// Labels inside the points shrink to fit them, so only the large points get one
const labels: Record<string, (d: TopicDatum) => string | undefined> = {
  right: d => d.topic,
  center: d => d.count >= 300 ? `${d.count}` : undefined,
  mixed: d => d.topic,
}
const labelPositions: Record<string, ((d: TopicDatum) => string) | undefined> = {
  mixed: d => d.count >= 500 ? 'center' : 'right',
}

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [isSpread, setIsSpread] = useState(true)
  const [spreadMax, setSpreadMax] = useState(0.45)
  const [labelPosition, setLabelPosition] = useState('mixed')

  return (
    <>
      <label>Spread: <input type='checkbox' checked={isSpread} onChange={() => setIsSpread(!isSpread)}/></label>
      <div><code>spreadMax: {spreadMax}</code></div>
      <input type='range' min={0.05} max={0.5} step={0.05} value={spreadMax} onChange={e => setSpreadMax(Number(e.target.value))}/>
      <div>
        <label>Labels: <select value={labelPosition} onChange={e => setLabelPosition(e.target.value)}>
          <option value='mixed'>Names inside the largest points, on the right for the rest</option>
          <option value='right'>Names on the right</option>
          <option value='center'>Counts inside the large points</option>
          <option value=''>None</option>
        </select></label>
      </div>
      <VisXYContainer<TopicDatum> data={data} xDomain={[-0.5, categories.length - 0.5]} yScale={Scale.scaleLog()} height={500}>
        <VisScatter<TopicDatum>
          x={d => d.category}
          y={d => d.count}
          size={d => d.count}
          sizeRange={[4, 90]}
          color={d => `var(--vis-color${d.category})`}
          label={labels[labelPosition]}
          labelPosition={labelPositions[labelPosition] ?? (labelPosition || undefined)}
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
        <VisTooltip triggers={{
          [Scatter.selectors.point]: (d: TopicDatum) => `${categories[d.category]} · ${d.topic}: ${d.count}`,
        }}/>
      </VisXYContainer>
    </>
  )
}
