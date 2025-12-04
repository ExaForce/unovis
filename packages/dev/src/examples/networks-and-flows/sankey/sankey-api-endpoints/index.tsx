import React, { useEffect, useRef, useState } from 'react'
import { VisSingleContainer, VisSankey, VisFlowLegend, VisSankeyRef } from '@unovis/react'
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

export const title = 'API Endpoints Tree'
export const subTitle = 'Collapsible nodes'

export const component = (props: ExampleViewerDurationProps): React.ReactNode => {
  const collapsedStateRef = useRef<{ [key: string]: boolean }>({})
  const rawData = apiRawData// .slice(25, 50)
  const [data, setData] = useState(getSankeyData(rawData))
  const sankeyRef = useRef<VisSankeyRef<ApiEndpointNode, ApiEndpointLink>>(null)
  const [legendWidth, setLegendWidth] = useState<number>()
  const [hiddenDepths, setHiddenDepths] = useState<Set<number>>(new Set())

  const nodeWidth = 30
  const nodeHorizontalSpacing = 260
  const [legendItems, setLegendItems] = useState<string[]>([])
  const onLegendItemClick = (label?: string, i?: number): void => {
    if (typeof i !== 'number') return
    const depth = i + 1
    setHiddenDepths(prev => {
      const next = new Set(prev)
      if (next.has(depth)) next.delete(depth)
      else next.add(depth)
      const base = getSankeyData(rawData, collapsedStateRef.current)
      setData(filterByDepth(base, next))
      return next
    })
  }

  useEffect(() => {
    const width = sankeyRef.current?.component?.getWidth() || 0
    const depth = sankeyRef.current?.component?.getSankeyDepth() || 0

    setLegendWidth(width - nodeHorizontalSpacing + 30)
    // eslint-disable-next-line no-irregular-whitespace
    setLegendItems(Array.from({ length: depth + 1 }, (_, i) => `Segment ${i + 1}`))
  }, [data, nodeWidth, nodeHorizontalSpacing])

  const filterByDepth = (base: { nodes: ApiEndpointNode[]; links: ApiEndpointLink[] }, hidden: Set<number>): { nodes: ApiEndpointNode[]; links: ApiEndpointLink[] } => {
    if (!hidden || hidden.size === 0) return base
    const nodes = base.nodes.filter(n => !hidden.has(n.depth))
    const allowedIds = new Set(nodes.map(n => n.id))
    const links = base.links.filter(l => allowedIds.has(l.source) && allowedIds.has(l.target))
    return { nodes, links }
  }

  const compareStrings = (a = '', b = ''): number => {
    const strA = a.toUpperCase()
    const strB = b.toUpperCase()

    if (strA < strB) return -1
    if (strA > strB) return 1
    return 0
  }

  return (
    <>
      <VisFlowLegend
        items={legendItems}
        onLegendItemClick={onLegendItemClick}
        customWidth={legendWidth}
      />
      <VisSingleContainer data={data} sizing={Sizing.Extend}>
        <VisSankey<ApiEndpointNode, ApiEndpointLink>
          ref={sankeyRef}
          labelPosition={Position.Right}
          labelVerticalAlign={VerticalAlign.Middle}
          labelBackground={false}
          nodeHorizontalSpacing={nodeHorizontalSpacing}
          nodeWidth={nodeWidth}
          nodeAlign={SankeyNodeAlign.Left}
          nodeIconColor={'#e9edfe'}
          nodePadding={35}
          nodeMinHeight={6}
          labelColor={'#0D1C5B'}
          labelCursor={'pointer'}
          label={d => d.isLeafNode ? d.method : `${d.leafs} ${d.leafs === 1 ? 'Leaf' : 'Leaves'}`}
          subLabel={d => d.label}
          nodeColor={d => d.isLeafNode ? '#0D1C5B' : null}
          subLabelFontSize={14}
          labelFontSize={14}
          labelMaxWidth={nodeHorizontalSpacing - 40}
          subLabelPlacement={SankeySubLabelPlacement.Below}
          nodeCursor={'pointer'}
          linkCursor={'pointer'}
          nodeIcon={d => (d.sourceLinks?.[0] || (!d.sourceLinks?.[0] && d.collapsed)) ? (d.collapsed ? '+' : '') : null}
          exitTransitionType={SankeyExitTransitionType.ToAncestor}
          enterTransitionType={SankeyEnterTransitionType.FromAncestor}
          highlightSubtreeOnHover={false}
          duration={props.duration}
          nodeSort={(a: SankeyNode<ApiEndpointNode, ApiEndpointLink>, b: SankeyNode<ApiEndpointNode, ApiEndpointLink>) => {
            const aParent = a.targetLinks[0]?.source
            const bParent = b.targetLinks[0]?.source
            const aGrandparent = a.targetLinks[0]?.source?.targetLinks[0]?.source
            const bGrandparent = b.targetLinks[0]?.source?.targetLinks[0]?.source

            if ((aParent === bParent)) { // Same parent nodes are sorted by: value + alphabetically
              return (b.value - a.value) || compareStrings(a?.path, b?.path)
            } else { // Different parent nodes are sorted by: 1st grandparent value + 1st parent value + alphabetically
              return (bGrandparent?.value - aGrandparent?.value) || (bParent?.value - aParent?.value) || -compareStrings(aParent?.path, bParent?.path)
            }
          }}
          linkSort={(a: SankeyLink<ApiEndpointNode, ApiEndpointLink>, b: SankeyLink<ApiEndpointNode, ApiEndpointLink>) => {
            return b.value - a.value || compareStrings(a.target?.path, b.target?.path) // Links sorted by: value + alphabetically
          }}
          events={{
            [Sankey.selectors.background]: {
              // eslint-disable-next-line no-console
              click: () => { console.log('Background click!') },
            },
            [Sankey.selectors.nodeGroup]: {
              click: (d: SankeyNode<ApiEndpointNode, ApiEndpointLink>) => {
                if (!d.targetLinks?.[0] || (!collapsedStateRef.current[d.id] && !d.sourceLinks?.[0])) return
                collapsedStateRef.current[d.id] = !collapsedStateRef.current[d.id]
                const base = getSankeyData(rawData, collapsedStateRef.current)
                setData(filterByDepth(base, hiddenDepths))
              },
            },
          }}
        />
      </VisSingleContainer>
    </>
  )
}

