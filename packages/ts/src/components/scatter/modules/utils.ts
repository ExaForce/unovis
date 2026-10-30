import { select, Selection } from 'd3-selection'
import { Position } from '@/types/position'

// Styles
import { UNOVIS_TEXT_DEFAULT } from '@/styles'

// Utils
import { clamp } from '@/utils/data'
import { getRectFitTranslation, rectIntersect } from '@/utils/misc'
import { estimateStringPixelLength, measureTextWidth } from '@/utils/text-measure'

// Types
import { ContinuousScale } from '@/types/scale'
import { Rect } from '@/types/misc'

// Local Types
import { ScatterPoint, ScatterPointGroupNode } from '../types'

const CENTRAL_LABEL_REFERENCE_FONT_SIZE = 100
const CENTRAL_LABEL_FIT = 0.9

export function isLabelPositionCenter (labelPosition: Position | `${Position}`): boolean {
  return (labelPosition !== Position.Top) && (labelPosition !== Position.Bottom) &&
  (labelPosition !== Position.Left) && (labelPosition !== Position.Right)
}

export function getPointPosition<Datum> (
  d: ScatterPoint<Datum>,
  xScale: ContinuousScale,
  yScale: ContinuousScale
): [number, number] {
  return [xScale(d._point.xValue) + d._point.xOffsetPx, yScale(d._point.yValue) + d._point.yOffsetPx]
}

/** The font of a point label at the size `getCentralLabelFontSize` measures the text at */
export function getCentralLabelReferenceFont (textElement: SVGTextElement): string {
  const style = window.getComputedStyle(textElement)
  return `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${CENTRAL_LABEL_REFERENCE_FONT_SIZE}px ${style.fontFamily || 'sans-serif'}`
}

/** The font size at which the label's box, one line tall, fits into `CENTRAL_LABEL_FIT` of the point's diameter.
 * The text width grows linearly with the font size, so it's measured once with `referenceFont`, or estimated without it */
export function getCentralLabelFontSize (text: string, pointDiameter: number, referenceFont?: string): number {
  if (!text) return 0

  const widthPerFontPx = referenceFont
    ? measureTextWidth(text, referenceFont) / CENTRAL_LABEL_REFERENCE_FONT_SIZE
    : estimateStringPixelLength(text, 1)
  return CENTRAL_LABEL_FIT * pointDiameter / Math.hypot(widthPerFontPx, UNOVIS_TEXT_DEFAULT.lineHeight)
}

export function getLabelShift (
  labelPosition: `${Position}`,
  pointDiameter: number,
  labelPadding = 5
): [number, number] {
  switch (labelPosition) {
    case Position.Top:
      return [0, -pointDiameter / 2 - labelPadding]
    case Position.Bottom:
      return [0, pointDiameter / 2 + labelPadding]
    case Position.Left:
      return [-pointDiameter / 2 - labelPadding, 0]
    case Position.Right:
      return [pointDiameter / 2 + labelPadding, 0]
    default:
      return [0, 0]
  }
}

export function getEstimatedLabelBBox<Datum> (
  d: ScatterPoint<Datum>,
  labelPosition: Position | `${Position}`,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
  fontSizePx: number
): Rect {
  const [x, y] = getPointPosition(d, xScale, yScale)
  const pointDiameter = d._point.sizePx

  const pointLabelText = d._point.label ?? ''
  const labelFontSize = isLabelPositionCenter(labelPosition) ? getCentralLabelFontSize(pointLabelText, pointDiameter) : fontSizePx

  const width = estimateStringPixelLength(pointLabelText, labelFontSize, 0.6)
  const height = labelFontSize

  const labelShift = getLabelShift(labelPosition, pointDiameter)
  const dx = labelPosition === Position.Left ? -width
    : labelPosition === Position.Right ? 0 : -width / 2
  const dy = labelPosition === Position.Top ? -height
    : labelPosition === Position.Bottom ? 0 : -height / 2

  const bbox: Rect = {
    x: x + labelShift[0] + dx,
    y: y + labelShift[1] + dy,
    width: width,
    height: height,
  }

  return bbox
}

function isRectOverlappingCircle (rect: Rect, [x, y]: [number, number], radius: number): boolean {
  const dx = x - clamp(x, rect.x, rect.x + rect.width)
  const dy = y - clamp(y, rect.y, rect.y + rect.height)
  return dx * dx + dy * dy < radius * radius
}

/** Puts every label at the first of its `labelPositions` that overlaps no point, labeled or not, and no visible label
 * (inside its point, none drawn above it), and stays within `bounds` unless it's the first one, which `bleed` makes room
 * for. A label that fits nowhere is hidden, or, when hovered, takes its first position and hides the labels in its way */
export function collideLabels<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
  fontSizePx: number,
  bounds: Rect
): void {
  const nodes = selection.nodes() as ScatterPointGroupNode[]
  const data = nodes.map(node => select<SVGGElement, ScatterPoint<Datum>>(node).datum())
  const positions = data.map(d => getPointPosition(d, xScale, yScale))
  const radii = data.map(d => (d._point.sizePx + (d._point.strokeWidthPx ?? 0)) / 2)
  const labelBoxes = data.map((d, i) => {
    nodes[i]._labelVisible = !!d._point.label
    nodes[i]._labelPosition = d._point.labelPosition
    return d._point.label ? getEstimatedLabelBBox(d, d._point.labelPosition, xScale, yScale, fontSizePx) : undefined
  })

  let referenceFont: string | undefined
  const fitsInside = (i: number): boolean => {
    if (!referenceFont) referenceFont = getCentralLabelReferenceFont(nodes[i].querySelector('text'))
    return getCentralLabelFontSize(data[i]._point.label, data[i]._point.sizePx, referenceFont) >= fontSizePx
  }

  const isDrawnBelow = (j: number, i: number): boolean =>
    !!(nodes[i].compareDocumentPosition(nodes[j]) & Node.DOCUMENT_POSITION_PRECEDING)

  const getBlockers = (i: number, rect: Rect, isCenter: boolean, findAll: boolean): number[] => {
    const blockers: number[] = []
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue
      const isBlocked = isRectOverlappingCircle(rect, positions[j], radii[j]) ||
        (nodes[j]._labelVisible && rectIntersect(rect, labelBoxes[j], 0.25))
      if (!isBlocked || (isCenter && isDrawnBelow(j, i))) continue
      blockers.push(j)
      if (!findAll) break
    }
    return blockers
  }

  nodes.forEach((node, i) => {
    if (!node._labelVisible) return

    const { labelPosition, labelPositions } = data[i]._point
    let rect: Rect | undefined
    const position = (labelPositions ?? [labelPosition]).find((candidate, k) => {
      const isCenter = isLabelPositionCenter(candidate)
      if (isCenter && !labelPositions) return true
      if (isCenter && !fitsInside(i)) return false

      rect = getEstimatedLabelBBox(data[i], candidate, xScale, yScale, fontSizePx)
      if (k > 0) {
        const fit = getRectFitTranslation(rect, bounds)
        if (fit.dx || fit.dy) return false
      }
      return !getBlockers(i, rect, isCenter, false).length
    })

    if (position !== undefined) {
      node._labelPosition = position
      labelBoxes[i] = rect ?? labelBoxes[i]
    } else if (node._forceShowLabel) {
      for (const j of getBlockers(i, labelBoxes[i], isLabelPositionCenter(node._labelPosition), true)) nodes[j]._labelVisible = false
    } else node._labelVisible = false
  })
}
