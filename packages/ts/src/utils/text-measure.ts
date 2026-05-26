// --- Text measurement caches ---------------------------------------------
// `getPreciseStringLengthPx` and SVG `getComputedTextLength()` both force a
// synchronous layout. Components such as Sankey, Treemap, and the axis call
// them many times per render with the same inputs. The caches below memoize
// the results to avoid redundant reflows.

type BoundedCache<K, V> = {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  clear: () => void;
}

function createBoundedCache<K, V> (maxSize: number): BoundedCache<K, V> {
  const map = new Map<K, V>()
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      if (map.size >= maxSize && !map.has(key)) {
        const firstKey = map.keys().next().value
        if (firstKey !== undefined) map.delete(firstKey)
      }
      map.set(key, value)
    },
    clear: () => map.clear(),
  }
}

const MAX_PRECISE_LENGTH_CACHE_SIZE = 5000
const MAX_COMPUTED_TEXT_LENGTH_CACHE_SIZE = 5000
const MAX_CLASS_CHAIN_CACHE_SIZE = 5000

type FontInfo = { font: string; fontSizePx: number }

const preciseStringLengthCache = createBoundedCache<string, number>(MAX_PRECISE_LENGTH_CACHE_SIZE)
const computedTextLengthCache = createBoundedCache<string, number>(MAX_COMPUTED_TEXT_LENGTH_CACHE_SIZE)
const computedTextLengthNodeCache = new WeakMap<Element, { text: string; length: number }>()
const nodeFontCache = new WeakMap<Element, FontInfo>()
// Cross-node cache keyed by the node's class + inline-style chain so we call
// `getComputedStyle` once per distinct chain rather than once per node — a
// large win because `getComputedStyle` after a DOM write forces a full style
// recalc, and charts typically share a handful of class chains across hundreds
// of label nodes.
const classChainFontCache = createBoundedCache<string, FontInfo>(MAX_CLASS_CHAIN_CACHE_SIZE)

// Shared 2D canvas context for `measureText`. Canvas measurement does not
// touch the DOM, does not force layout, and is orders of magnitude faster
// than `SVGTextElement.getComputedTextLength()`.
let measureCtx: CanvasRenderingContext2D | null = null
function getMeasureContext (): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  measureCtx = canvas.getContext('2d')
  return measureCtx
}

/**
 * Measures the width of a string in pixels using a shared off-screen
 * `<canvas>` 2D context. Does NOT trigger DOM layout or style recalculation.
 *
 * @param {string} str - The string to measure.
 * @param {string} font - A CSS shorthand font string (e.g.
 *   `'600 12px Inter, sans-serif'`). Must include at minimum size and family.
 * @returns {number} The measured width in pixels, or `0` if the canvas API
 *   is unavailable (e.g. during server-side rendering).
 */
export function measureTextWidth (str: string, font: string): number {
  const ctx = getMeasureContext()
  if (!ctx) return 0
  if (ctx.font !== font) ctx.font = font
  return ctx.measureText(str).width
}

/**
 * Clears the internal text-measurement caches used by
 * `getPreciseStringLengthPx` and the cached `getComputedTextLength` wrapper.
 * Call this if the page's fonts change after the first measurement (e.g. a
 * web font finishes loading) or if existing nodes have been restyled.
 */
export function clearTextMeasurementCache (): void {
  preciseStringLengthCache.clear()
  computedTextLengthCache.clear()
  classChainFontCache.clear()
}

function getClassChainKey (node: Element): string {
  // class + inline style up to the nearest <svg>. Attribute reads are
  // reflow-free; inline style is included because it overrides cascaded font.
  let key = ''
  let cursor: Element | null = node
  while (cursor) {
    key += `|${cursor.getAttribute('class') || ''};${cursor.getAttribute('style') || ''}`
    if (cursor.tagName === 'svg') break
    cursor = cursor.parentElement
  }
  return key
}

function getNodeFont (node: Element): FontInfo {
  let info = nodeFontCache.get(node)
  if (info !== undefined) return info

  const chainKey = getClassChainKey(node)
  const cachedByChain = classChainFontCache.get(chainKey)
  if (cachedByChain !== undefined) {
    nodeFontCache.set(node, cachedByChain)
    return cachedByChain
  }

  const style = window.getComputedStyle(node)
  const fontSize = style.fontSize || '10px'
  const fontSizePx = parseFloat(fontSize) || 10
  const font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${fontSize} ${style.fontFamily || 'sans-serif'}`
  info = { font, fontSizePx }
  classChainFontCache.set(chainKey, info)
  nodeFontCache.set(node, info)
  return info
}

/**
 * Returns the resolved CSS `font-size` of the node in pixels, using the same
 * class-chain cache as the internal text-measurement helpers. Use this in
 * component code instead of `parseFloat(window.getComputedStyle(el).fontSize)`
 * — that pattern forces a style recalc on every call and dominates render
 * time when there are many labels.
 *
 * @param {Element} node - The element to read the font size from.
 * @returns {number} The font size in pixels (defaults to `10` if unavailable).
 */
export function getCachedFontSizePx (node: Element): number {
  return getNodeFont(node).fontSizePx
}

export function getCachedComputedTextLength (node: SVGTextElement | SVGTSpanElement): number {
  const text = node.textContent || ''

  const nodeEntry = computedTextLengthNodeCache.get(node)
  if (nodeEntry && nodeEntry.text === text) return nodeEntry.length

  const { font } = getNodeFont(node)
  const key = `${font}|${text}`

  const cached = computedTextLengthCache.get(key)
  if (cached !== undefined) {
    computedTextLengthNodeCache.set(node, { text, length: cached })
    return cached
  }

  const length = getMeasureContext()
    ? measureTextWidth(text, font)
    : node.getComputedTextLength()
  computedTextLengthCache.set(key, length)
  computedTextLengthNodeCache.set(node, { text, length })
  return length
}

/**
 * Calculates the precise length of a string in pixels.
 * @param {string} str - The string to be measured.
 * @param {string} [fontFamily] - The font family of the string.
 * @param {(string | number)} [fontSize] - The font size of the string.
 * @returns {number} The precise length of the string in pixels.
 */
export function getPreciseStringLengthPx (str: string, fontFamily: string, fontSize: string | number): number {
  const cacheKey = `${fontFamily}|${fontSize}|${str}`
  const cached = preciseStringLengthCache.get(cacheKey)
  if (cached !== undefined) return cached

  // Prefer canvas measurement — no DOM mutation, no layout flush.
  const fontSizeStr = typeof fontSize === 'number' ? `${fontSize}px` : fontSize
  const ctx = getMeasureContext()
  let length: number
  if (ctx) {
    length = measureTextWidth(str, `${fontSizeStr} ${fontFamily}`)
  } else {
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    const text = document.createElementNS(svgNS, 'text')
    text.textContent = str
    text.setAttribute('font-size', `${fontSize}`)
    text.setAttribute('font-family', fontFamily)
    svg.appendChild(text)
    document.body.appendChild(svg)
    length = text.getComputedTextLength()
    document.body.removeChild(svg)
  }

  preciseStringLengthCache.set(cacheKey, length)
  return length
}
