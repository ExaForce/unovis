import React, { useRef, useState } from 'react'
import { VisSingleContainer, VisSankey } from '@unovis/react'
import {
  Position,
  Sankey,
  SankeyEnterTransitionType,
  SankeyExitTransitionType,
  SankeyLink,
  SankeyNode,
  SankeyNodeAlign,
  SankeySubLabelPlacement,
  Sizing,
  VerticalAlign,
} from '@unovis/ts'
import { ExampleViewerDurationProps } from '@src/components/ExampleViewer/index'

import apiRawData from './apieplist.json'
import { getSankeyData, ApiEndpointNode, ApiEndpointLink } from './data'

export const title = 'Sankey with Zoom'
export const subTitle = 'Collapsible nodes'

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const collapsedStateRef = useRef<{ [key: string]: boolean }>({})
  const rawData = apiRawData// .slice(25, 50)
  const [data, setData] = useState(getSankeyData(rawData))
  const sankeyRef = useRef<{ component?: Sankey<ApiEndpointNode, ApiEndpointLink> }>(null)

  const nodeWidth = 30
  const nodeHorizontalSpacing = 260

  // const compareStrings = (a = '', b = ''): number => {
  //   const strA = a.toUpperCase()
  //   const strB = b.toUpperCase()

  //   if (strA < strB) return -1
  //   if (strA > strB) return 1
  //   return 0
  // }

  const zoomStep = 1.2

  const getCurrentScales = (): [number, number] => {
    const c = sankeyRef.current?.component
    const [h, v] = c?.getLayoutScale() ?? [1, 1]

    return [h, v]
  }

  const onZoom = (factor: number): void => {
    const c = sankeyRef.current?.component
    if (!c) return

    const [h, v] = getCurrentScales()
    const nextH = h
    const nextV = v * factor
    c.setLayoutScale(nextH, nextV)
  }

  const onFit = (): void => {
    const c = sankeyRef.current?.component
    c?.fitView?.(600)
  }

  return (
    <>
      <VisSingleContainer data={data} height="95vh" sizing={Sizing.Fit}>
        <VisSankey<ApiEndpointNode, ApiEndpointLink>
          ref={sankeyRef}
          labelPosition={Position.Right}
          labelVerticalAlign={VerticalAlign.Middle}
          labelMaxWidthTakeAvailableSpace={true}
          labelMaxWidth={240}
          nodeHorizontalSpacing={nodeHorizontalSpacing}
          nodeWidth={nodeWidth}
          nodeAlign={SankeyNodeAlign.Left}
          nodeIconColor={'#e9edfe'}
          nodePadding={10}
          nodeMinHeight={5}
          labelBackground={false}
          labelColor={'#0D1C5B'}
          labelCursor={'pointer'}
          label={d => d.isLeafNode ? d.method : `${d.leafs} ${d.leafs === 1 ? 'Leaf' : 'Leaves'}`}
          subLabel={d => d.label}
          nodeColor={d => d.isLeafNode ? '#0D1C5B' : null}
          subLabelFontSize={14}
          labelFontSize={14}
          subLabelPlacement={SankeySubLabelPlacement.Below}
          nodeCursor={'pointer'}
          linkCursor={'pointer'}
          nodeIcon={d => (d.sourceLinks?.[0] || (!d.sourceLinks?.[0] && d.collapsed)) ? (d.collapsed ? '+' : '') : null}
          enterTransitionType={SankeyEnterTransitionType.FromAncestor}
          highlightSubtreeOnHover={false}
          duration={props.duration}
          events={{
            [Sankey.selectors.background]: {
              // eslint-disable-next-line no-console
              click: () => { console.log('Background click!') },
            },
            [Sankey.selectors.nodeGroup]: {
              click: (d: SankeyNode<ApiEndpointNode, ApiEndpointLink>) => {
                if (!d.targetLinks?.[0] || (!collapsedStateRef.current[d.id] && !d.sourceLinks?.[0])) return
                collapsedStateRef.current[d.id] = !collapsedStateRef.current[d.id]
                setData(getSankeyData(rawData, collapsedStateRef.current))
              },
            },
          }}
        />
      </VisSingleContainer>

      <div style={{ position: 'absolute', right: 10, bottom: 170, display: 'flex', gap: 8 }}>
        <button onClick={() => onZoom(zoomStep)}>Zoom In</button>
        <button onClick={() => onZoom(1 / zoomStep)}>Zoom Out</button>
        <button onClick={onFit}>Fit View</button>
      </div>

      <div style={{ border: '1px solid #000', position: 'absolute', width: '300px', height: '150px', bottom: '10px', right: '10px', backgroundColor: '#fff' }}>
        <VisSingleContainer data={data} width="100%" height="100%" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <VisSankey<ApiEndpointNode, ApiEndpointLink>
            labelPosition={Position.Right}
            labelMaxWidth={0}
            labelVerticalAlign={VerticalAlign.Middle}
            nodeWidth={5}
            nodeAlign={SankeyNodeAlign.Left}
            nodeIconColor={'#e9edfe'}
            nodePadding={1}
            nodeMinHeight={1}
            label={() => ''}
            subLabel={() => ''}
            nodeColor={d => d.isLeafNode ? '#0D1C5B' : null}
            subLabelFontSize={14}
            enableZoom={false}
            labelFontSize={14}
            subLabelPlacement={SankeySubLabelPlacement.Below}
            nodeIcon={d => (d.sourceLinks?.[0] || (!d.sourceLinks?.[0] && d.collapsed)) ? (d.collapsed ? '+' : '') : null}
            exitTransitionType={SankeyExitTransitionType.ToAncestor}
            enterTransitionType={SankeyEnterTransitionType.FromAncestor}
            highlightSubtreeOnHover={false}
            duration={0}
          />
        </VisSingleContainer>
      </div>
    </>
  )
}

