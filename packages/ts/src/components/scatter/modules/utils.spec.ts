import { describe, expect, it } from 'vitest'

// Styles
import { UNOVIS_TEXT_DEFAULT } from '@/styles'

// Utils
import { estimateStringPixelLength } from '@/utils/text-measure'

// Local
import { getCentralLabelFontSize } from './utils'

/** Diagonal of the label's box at the given font size, the box being one line tall */
function getLabelBoxDiagonal (text: string, fontSize: number): number {
  return Math.hypot(estimateStringPixelLength(text, fontSize), fontSize * UNOVIS_TEXT_DEFAULT.lineHeight)
}

describe('getCentralLabelFontSize', () => {
  it('fits the label box into the point, whatever the text length', () => {
    for (const text of ['7', '42', 'Coding', 'Code review', 'A much longer topic name']) {
      const fontSize = getCentralLabelFontSize(text, 60)
      expect(getLabelBoxDiagonal(text, fontSize)).toBeCloseTo(0.9 * 60)
    }
  })

  it('gives longer labels smaller fonts', () => {
    const sizes = ['7', 'Coding', 'Code review'].map(text => getCentralLabelFontSize(text, 60))
    expect(sizes[0]).toBeGreaterThan(sizes[1])
    expect(sizes[1]).toBeGreaterThan(sizes[2])
  })

  it('scales the font with the point', () => {
    expect(getCentralLabelFontSize('Coding', 90)).toBeCloseTo(2 * getCentralLabelFontSize('Coding', 45))
  })

  it('measures the text with the reference font when given one', () => {
    // Without a canvas the measurement falls back to the estimate at the font's size, so the two agree
    expect(getCentralLabelFontSize('Coding', 90, 'normal 500 100px sans-serif')).toBeCloseTo(getCentralLabelFontSize('Coding', 90))
  })

  it('leaves out empty labels', () => {
    expect(getCentralLabelFontSize('', 60)).toBe(0)
  })
})
