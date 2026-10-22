import { select, Selection } from 'd3-selection'
import { symbol } from 'd3-shape'
import { color } from 'd3-color'
import { Position } from '@/types/position'
import { Symbol, SymbolType } from '@/types/symbol'

// Utils
import { smartTransition } from '@/utils/d3'
import { UNOVIS_PATTERN_INDEX_ATTR } from '@/utils/pattern'
import { getCSSVariableValue, isStringCSSVariable } from '@/utils/misc'
import { hexToBrightness } from '@/utils/color'

// Types
import { ContinuousScale } from '@/types/scale'

// Config
import { ScatterConfigInterface } from '../config'

// Local Types
import { ScatterPoint, ScatterPointGroupNode } from '../types'

// Local Utils
import { getCentralLabelFontSize, getCentralLabelReferenceFont, getLabelShift, getPointPosition, isLabelPositionCenter } from './utils'

/** Returns a getter that resolves the central label reference font from the first text element it's given */
function createReferenceFontGetter (): (textElement: SVGTextElement) => string {
  let font: string | undefined
  return textElement => {
    if (!font) font = getCentralLabelReferenceFont(textElement)
    return font
  }
}

/** Places the label at `position`: a central label is sized to fit the point and colored to contrast with its fill */
function renderLabel<Datum> (
  textElement: SVGTextElement,
  d: ScatterPoint<Datum>,
  position: Position,
  config: ScatterConfigInterface<Datum>,
  getReferenceFont: (textElement: SVGTextElement) => string,
  duration: number
): void {
  const label = select(textElement)
  const pointDiameter = d._point.sizePx
  const isCenter = isLabelPositionCenter(position)
  const centralLabelFontSize = isCenter ? getCentralLabelFontSize(d._point.label, pointDiameter, getReferenceFont(textElement)) : 0

  let labelColor = d._point.labelColor
  if (!labelColor && isCenter) {
    const c = d._point.color || 'var(--vis-scatter-fill-color)'
    const hex = color(isStringCSSVariable(c) ? getCSSVariableValue(c, textElement) : c)?.hex()
    const brightness = hexToBrightness(hex)
    labelColor = brightness > config.labelTextBrightnessRatio ? 'var(--vis-scatter-point-label-text-color-dark)' : 'var(--vis-scatter-point-label-text-color-light)'
  }

  const labelShift = getLabelShift(position, pointDiameter)
  label
    .attr('x', labelShift[0])
    .attr('y', labelShift[1])
    .style('font-size', isCenter ? `${centralLabelFontSize}px` : null)
    .style('text-anchor', () => {
      switch (position) {
        case Position.Right: return null
        case Position.Left: return 'end'
        default: return 'middle'
      }
    })
    .style('dominant-baseline', () => {
      switch (position) {
        case Position.Top: return null
        case Position.Bottom: return 'hanging'
        default: return 'central'
      }
    })

  const labelTransition = duration ? smartTransition(label, duration) : label
  labelTransition.style('fill', labelColor)
  const node = textElement.parentNode as ScatterPointGroupNode
  node._renderedLabelPosition = position
}

export function createPoints<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  xScale: ContinuousScale,
  yScale: ContinuousScale
): void {
  selection.attr('transform', d => `translate(${d._point.xValue},${d._point.yValue})`)
  selection.append('path')
    .attr(UNOVIS_PATTERN_INDEX_ATTR, d => d._point.groupIndex)
    .style('fill', d => d._point.color)
    .style('mask', d => d._point.mask)

  selection.attr('transform', d => `translate(${getPointPosition(d, xScale, yScale)}) scale(0)`)
}

export function updatePoints<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  config: ScatterConfigInterface<Datum>,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
  duration: number
): void {
  const symbolGenerator = symbol()
  // Without a duration `smartTransition` only interrupts, so do it once instead of twice per point
  if (!duration) selection.selectAll<SVGElement, unknown>('path, text').interrupt()
  const getReferenceFont = createReferenceFontGetter()

  selection.each((d, index, elements) => {
    const group: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]> = select(elements[index])
    const path = group.select('path')

    // Shape
    const pointDiameter = d._point.sizePx
    const pointColor = d._point.color
    const pointStrokeColor = d._point.strokeColor ?? null
    const pointStrokeWidth = d._point.strokeWidthPx ?? null
    path.attr('d', () => {
      const svgPath = d._point.shape ? symbolGenerator
        .size(Math.PI * pointDiameter * pointDiameter / 4)
        .type(Symbol[d._point.shape as SymbolType])() : null
      return svgPath
    })

    // Already interrupted in bulk above, so `smartTransition` would just repeat that work per point
    const pathTransition = duration ? smartTransition(path, duration) : path
    pathTransition
      .style('fill', pointColor)
      .style('mask', d._point.mask)
      .style('stroke', pointStrokeColor)
      .style('stroke-width', `${pointStrokeWidth}px`)

    // Created lazily, so a chart without labels doesn't pay for a text node per point
    const pointLabelText = d._point.label ?? ''
    let label = group.select<SVGTextElement>('text')
    if (label.empty()) {
      if (pointLabelText) label = group.append<SVGTextElement>('text').style('pointer-events', 'none')
    }

    if (!label.empty()) {
      label.html(pointLabelText)
      renderLabel(label.node(), d, d._point.labelPosition, config, getReferenceFont, duration)
    }

    path.style('cursor', d._point.cursor)
  })

  smartTransition(selection, duration)
    .attr('transform', d => `translate(${getPointPosition(d, xScale, yScale)}) scale(1)`)
}

/** Renders the label positions `collideLabels` picked and hides the labels that fit nowhere */
export function updateLabels<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  config: ScatterConfigInterface<Datum>
): void {
  const getReferenceFont = createReferenceFontGetter()
  selection.each((d, i, elements) => {
    const node = elements[i] as ScatterPointGroupNode
    const label = select(node).select<SVGTextElement>('text')
    if (node._labelPosition !== node._renderedLabelPosition) {
      label.interrupt()
      renderLabel(label.node(), d, node._labelPosition, config, getReferenceFont, 0)
    }
    label.attr('opacity', node._labelVisible ? 1 : 0)
  })
}

export function removePoints<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
  duration: number
): void {
  smartTransition(selection, duration)
    .attr('transform', d => `translate(${getPointPosition(d, xScale, yScale)}) scale(0)`)
    .remove()
}

