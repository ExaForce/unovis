// Pretext wrapper
import { prepareWithSegments, measureNaturalWidth } from 'utils/pretext'

// Types
import { UnovisText } from 'types/text'

// Styles
import { UNOVIS_TEXT_DEFAULT } from 'styles/index'

const CSS_VAR_REGEX = /var\((--[^,)]+)(?:,([^)]+))?\)/g

// ---------------------------------------------------------------------------
// Canvas font registration
// ---------------------------------------------------------------------------
// `document.fonts.ready` and `document.fonts.check()` are about DOM rendering
// readiness — they don't tell us whether the canvas's font cache is warm.
// `document.fonts.load(fontString)` actually loads the font into the browser-
// wide font face set, which the canvas context shares. We wait on that before
// trusting `ctx.measureText` (used by pretext).
//
// Until a fontString is loaded, `measureTextWidth(str, fontString)` returns
// `null` and callers fall back to ratio-based estimation. Once load resolves,
// we notify any registered listeners (containers re-render) and from then on
// pretext measurements are stable and deterministic.

interface DocumentFonts {
  load(font: string, text?: string): Promise<readonly unknown[]>;
  ready: Promise<unknown>;
  status: 'loading' | 'loaded';
}

function getDocumentFonts (): DocumentFonts | undefined {
  if (typeof document === 'undefined') return undefined
  return (document as unknown as { fonts?: DocumentFonts }).fonts
}

const loadedFonts = new Set<string>()
const loadingFonts = new Set<string>()
const fontsReadyListeners: Array<() => void> = []
let notifyScheduled = false

function notifyFontsReady (): void {
  if (notifyScheduled) return
  notifyScheduled = true
  // Coalesce multiple font-load completions arriving in the same frame into
  // one fan-out. Listeners typically trigger re-renders, which we don't want
  // duplicated.
  const fire = (): void => {
    notifyScheduled = false
    fontsReadyListeners.slice().forEach(cb => cb())
  }
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(fire)
  else Promise.resolve().then(fire)
}

function ensureFontLoaded (fontString: string): void {
  if (loadedFonts.has(fontString)) return
  if (loadingFonts.has(fontString)) return
  const fonts = getDocumentFonts()
  if (!fonts) {
    // No FontFaceSet (SSR, jsdom). Mark as loaded — `measureTextWidth` will
    // still work or fall back, depending on canvas availability.
    loadedFonts.add(fontString)
    return
  }
  loadingFonts.add(fontString)
  fonts.load(fontString)
    .then(() => {
      loadingFonts.delete(fontString)
      loadedFonts.add(fontString)
      notifyFontsReady()
    })
    .catch(() => {
      // Load rejected (invalid descriptor, etc). Don't mark as loaded — keep
      // returning null so callers stay on ratio fallback.
      loadingFonts.delete(fontString)
    })
}

/**
 * Register a callback invoked once any in-flight font load completes.
 * Listeners persist across multiple loads; each completion fires every
 * registered callback (debounced to one rAF).
 *
 * Returns an `unregister` function. Callers (typically containers) should
 * invoke it on teardown to avoid firing stale callbacks against destroyed
 * charts.
 */
export function onFontsReady (callback: () => void): () => void {
  fontsReadyListeners.push(callback)
  return () => {
    const idx = fontsReadyListeners.indexOf(callback)
    if (idx >= 0) fontsReadyListeners.splice(idx, 1)
  }
}

/**
 * Measures a string's natural width via canvas (pretext).
 *
 * Returns `null` when measurement would be unreliable:
 *  - The requested fontString hasn't been loaded into the canvas font cache
 *    yet (kicks off a `document.fonts.load` so the font becomes available).
 *  - There's no `document.fonts` API and pretext's canvas isn't usable.
 *
 * Callers should fall back to ratio-based estimation when this returns null.
 * Once the font finishes loading, listeners registered via `onFontsReady`
 * fire (typically containers re-rendering), and subsequent calls return
 * deterministic canvas widths.
 */
export function measureTextWidth (str: string, fontString: string): number | null {
  if (!loadedFonts.has(fontString)) {
    ensureFontLoaded(fontString)
    return null
  }
  if (!str) return 0
  return Math.floor(measureNaturalWidth(prepareWithSegments(str, fontString)))
}

/**
 * Reads a canvas-ready font shorthand string from an element's computed style.
 * Optionally overrides specific parts — useful when the caller knows the
 * intended font-size but the element's computed style hasn't settled yet
 * (e.g. on the very first render after creating the element).
 */
export function getFontStringFromElement (
  element: Element,
  overrides?: { fontSize?: number | string }
): string {
  const s = getComputedStyle(element)
  const fontSize = overrides?.fontSize !== undefined
    ? (typeof overrides.fontSize === 'number' ? `${overrides.fontSize}px` : overrides.fontSize)
    : s.fontSize
  return `${s.fontStyle || 'normal'} ${s.fontWeight || 400} ${fontSize} ${s.fontFamily}`
}

function resolveCSSVariables (value: string, context: Element): string {
  if (!value.includes('var(')) return value
  const cs = getComputedStyle(context)
  return value.replace(CSS_VAR_REGEX, (_, name: string, fallback?: string) => {
    const resolved = cs.getPropertyValue(name.trim()).trim()
    return resolved || (fallback?.trim() ?? '')
  })
}

/**
 * Builds a canvas-ready font shorthand string from a UnovisText block,
 * resolving any CSS variables in `fontFamily` against the given context element.
 * If `textBlock.fontString` is set, it is returned as-is.
 */
export function resolveFontString (textBlock: UnovisText, context: Element): string {
  if (textBlock.fontString) return textBlock.fontString

  const fontFamily = resolveCSSVariables(
    textBlock.fontFamily ?? UNOVIS_TEXT_DEFAULT.fontFamily ?? 'sans-serif',
    context
  )
  const fontSize = textBlock.fontSize ?? UNOVIS_TEXT_DEFAULT.fontSize ?? 12
  const fontWeight = textBlock.fontWeight ?? 400
  return `normal ${fontWeight} ${fontSize}px ${fontFamily}`
}
