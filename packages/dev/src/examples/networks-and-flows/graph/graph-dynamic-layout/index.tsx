import React, { useEffect, useMemo, useState } from 'react'
import { VisSingleContainer, VisGraph } from '@unovis/react'
import { GraphLayoutType } from '@unovis/ts'
import { generateNodeLinkData, randomNumberGenerator } from '@src/utils/data'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

export const title = 'Dynamic Layout'
export const subTitle = 'Select Layout From Dropdown'

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const [data, setData] = useState(generateNodeLinkData(100))
  const layouts = Object.values(GraphLayoutType)
  const initial = GraphLayoutType.Parallel
  const [layout, setLayout] = useState<string>(initial)

  // Generate new data every 2 seconds
  useEffect(() => {
    setTimeout(() => {
      const newData = generateNodeLinkData(10 + Math.floor(randomNumberGenerator() * 150))

      // Adding some random x, y values to the nodes for `GraphLayoutType.Precalculated`
      newData.nodes.forEach(n => {
        n.x = randomNumberGenerator() * 1000
        n.y = randomNumberGenerator() * 1000
      })

      setData(newData)
    }, 10000)
  }, [data])

  const forceLayoutSettings = useMemo(() => ({
    fixNodePositionAfterSimulation: true,
  }), [])

  console.log(data.nodes)
  return (
    <>
      <select onChange={e => setLayout(e.target.value)} defaultValue={initial}>
        {layouts.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <VisSingleContainer data={data} height={900}>
        <VisGraph
          layoutType={layout}
          forceLayoutSettings={forceLayoutSettings}
          duration={props.duration}
          layoutParallelNodeSubGroup={n => n.subgroup}
          layoutNodeGroup={n => n.group}
          layoutParallelNodesPerColumn={3} 
          layoutParallelSubGroupsPerRow={2}
          layoutParallelGroupSpacing={80}
          layoutParallelNodeSpacing={35}
          layoutParallelSubGroupSpacing={30}
        />
      </VisSingleContainer>
    </>
  )
}

