import { select, Selection } from 'd3-selection'
import { Position } from '@/types/position'

// Styles
import { UNOVIS_TEXT_DEFAULT } from '@/styles'

// Utils
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
  const centralLabelFontSize = getCentralLabelFontSize(pointLabelText, pointDiameter)

  const width = estimateStringPixelLength(pointLabelText, isLabelPositionCenter(labelPosition) ? centralLabelFontSize : fontSizePx, 0.6)
  const height = fontSizePx

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

/** Picks every label the first of its point's `labelPositions` where it fits, and hides the labels that fit nowhere.
 * The positions after the first must also stay within `bounds`, as `bleed` makes room for the first one only. A hovered
 * label takes its first fitting position, or its first one, hiding the labels in its way. The result is left on the
 * nodes (`_labelPosition`, `_labelVisible`) for `updateLabels` to render */
export function collideLabels<Datum> (
  selection: Selection<SVGGElement, ScatterPoint<Datum>, SVGGElement, ScatterPoint<Datum>[]>,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
  fontSizePx: number,
  bounds: Rect
): void {
  const nodes = selection.nodes() as ScatterPointGroupNode[]
  const data = nodes.map(node => select<SVGGElement, ScatterPoint<Datum>>(node).datum())
  nodes.forEach((node, i) => {
    node._labelVisible = true
    node._labelPosition = data[i]._point.labelPosition
  })

  let referenceFont: string | undefined
  const fitsInside = (i: number): boolean => {
    if (!referenceFont) referenceFont = getCentralLabelReferenceFont(nodes[i].querySelector('text'))
    return getCentralLabelFontSize(data[i]._point.label, data[i]._point.sizePx, referenceFont) >= fontSizePx
  }

  const getBlockers = (i: number, rect: Rect, findAll: boolean): number[] => {
    const blockers: number[] = []
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue
      const [x, y] = getPointPosition(data[j], xScale, yScale)
      const r = data[j]._point.sizePx / 2
      const isBlocked = rectIntersect(rect, { x: x - r, y: y - r, width: 2 * r, height: 2 * r }, 2) || (nodes[j]._labelVisible &&
        rectIntersect(rect, getEstimatedLabelBBox(data[j], nodes[j]._labelPosition, xScale, yScale, fontSizePx), 0.25))
      if (!isBlocked) continue
      blockers.push(j)
      if (!findAll) break
    }
    return blockers
  }

  nodes.forEach((node, i) => {
    if (!node._labelVisible) return

    const { labelPosition, labelPositions } = data[i]._point
    const position = (labelPositions ?? [labelPosition]).find((candidate, k) => {
      if (isLabelPositionCenter(candidate)) return !labelPositions || fitsInside(i)

      const rect = getEstimatedLabelBBox(data[i], candidate, xScale, yScale, fontSizePx)
      const fit = getRectFitTranslation(rect, bounds)
      if (k > 0 && (fit.dx || fit.dy)) return false
      return !getBlockers(i, rect, false).length
    })

    if (position !== undefined) node._labelPosition = position
    else if (node._forceShowLabel) {
      const rect = getEstimatedLabelBBox(data[i], node._labelPosition, xScale, yScale, fontSizePx)
      for (const j of getBlockers(i, rect, true)) nodes[j]._labelVisible = false
    } else node._labelVisible = false
  })
}
