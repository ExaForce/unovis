// Page-level benchmark of unovis text measurement: pretext vs ratio fallback.
//
// Renders a dense Sankey diagram repeatedly and collects:
//   - per-render duration (mean, p50, p95, max)
//   - FPS over the run (rAF counter)
//   - long tasks (PerformanceObserver `longtask`)
//   - JS heap delta (performance.memory; Chrome flag --enable-precise-memory-info recommended)
//
// Mode is controlled by ?mode=pretext or ?mode=ratio in the URL.
// Iteration count by ?n=200 (default 100).

import { SingleContainer } from 'containers/single-container'
import { Sankey } from 'components/sankey'
import { Position } from 'types/position'
import { FitMode } from 'types/text'
import { SankeyNodeAlign, SankeySubLabelPlacement } from 'components/sankey/types'

const params = new URLSearchParams(location.search)
const MODE = params.get('mode') === 'ratio' ? 'ratio' : 'pretext'
const scenarioParam = params.get('scenario') ?? 'render'
const SCENARIO = (['zoom', 'wrap', 'render'].includes(scenarioParam) ? scenarioParam : 'render') as 'render' | 'zoom' | 'wrap'
const N = Number(params.get('n') || 100)

const statusEl = document.getElementById('status') as HTMLPreElement
const resultsEl = document.getElementById('results') as HTMLPreElement
const chartEl = document.getElementById('chart') as HTMLDivElement
const setStatus = (msg: string): void => { statusEl.textContent = msg }

if (MODE === 'ratio') {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  (globalThis as { UNOVIS_FORCE_RATIO_MEASUREMENT?: boolean }).UNOVIS_FORCE_RATIO_MEASUREMENT = true
}

// Synthetic data: 60 nodes across 3 layers, with long URL-like labels to stress
// text measurement. Self-contained so no fixture dependency.
type Node = { id: string; label: string }
type Link = { source: string; target: string; value: number }

function generateData (): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = []
  const links: Link[] = []
  const layerSizes = [20, 20, 20]
  let idCounter = 0
  for (let layer = 0; layer < layerSizes.length; layer++) {
    for (let i = 0; i < layerSizes[layer]; i++) {
      const id = `n${idCounter++}`
      const hash = Math.random().toString(36).slice(2, 14)
      const label = `/component---src-pages-${['company', 'product', 'about', 'careers', 'pricing'][i % 5]}-${['a', 'b', 'c', 'd'][i % 4]}-js-${hash}.js`
      nodes.push({ id, label })
    }
  }
  for (let layer = 0; layer < layerSizes.length - 1; layer++) {
    const layerStart = layerSizes.slice(0, layer).reduce((a, b) => a + b, 0)
    const nextStart = layerStart + layerSizes[layer]
    for (let i = 0; i < layerSizes[layer]; i++) {
      const fromId = nodes[layerStart + i].id
      // Each source links to 2-3 targets in the next layer
      for (let j = 0; j < 3; j++) {
        const toIdx = (i + j) % layerSizes[layer + 1]
        const toId = nodes[nextStart + toIdx].id
        links.push({ source: fromId, target: toId, value: 1 + Math.random() * 10 })
      }
    }
  }
  return { nodes, links }
}

async function main (): Promise<void> {
  setStatus(`mode=${MODE} n=${N} — waiting for fonts…`)
  if (document.fonts) await document.fonts.ready
  setStatus(`mode=${MODE} n=${N} — building Sankey…`)

  const data = generateData()
  const sankey = new Sankey<Node, Link>({
    id: (d: Node) => d.id,
    linkValue: (d: Link) => d.value,
    label: (d: Node) => d.label,
    labelFit: SCENARIO === 'wrap' ? FitMode.Wrap : FitMode.Trim,
    labelMaxWidth: 220,
    labelForceWordBreak: SCENARIO === 'wrap', // ensure even no-natural-break labels split
    labelPosition: Position.Auto,
    labelVerticalAlign: 'middle' as const,
    subLabelPlacement: SankeySubLabelPlacement.Below,
    nodeAlign: SankeyNodeAlign.Justify,
    nodeWidth: 20,
    enableZoom: SCENARIO === 'zoom',
    zoomExtent: [0.5, 3],
  })
  const container = new SingleContainer(chartEl, {
    height: 700,
    component: sankey as unknown as never,
  } as never, data as never)

  // Initial render so layout is computed once before the timed loop
  container.render(0)
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))))

  setStatus(`mode=${MODE} n=${N} — running ${N} renders…`)

  // Collect performance signals
  const renderTimes: number[] = []
  const longTasks: number[] = []
  const observer = 'PerformanceObserver' in window ? new PerformanceObserver(list => {
    for (const e of list.getEntries()) longTasks.push(e.duration)
  }) : undefined
  observer?.observe?.({ entryTypes: ['longtask'] })

  let frames = 0
  let stopFrames = false
  const tick = (): void => { if (stopFrames) return; frames++; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)

  type Mem = { usedJSHeapSize: number; totalJSHeapSize: number }
  const memBefore = (performance as unknown as { memory?: Mem }).memory?.usedJSHeapSize ?? 0
  const tStart = performance.now()

  // Zoom-scenario state. Oscillate scale within zoomExtent so layout shifts each
  // iteration: layer spacing changes → labels re-trim against new widths. Same
  // label corpus throughout, so pretext's segment cache should be highly
  // effective vs ratio which recomputes per call.
  const zoomMin = 0.6
  const zoomMax = 2.4
  const zoomStep = (zoomMax - zoomMin) / 20 // ~40 frames per full cycle

  for (let i = 0; i < N; i++) {
    const r0 = performance.now()
    if (SCENARIO === 'zoom') {
      // Triangular wave: 0..1..0..1..
      const phase = (i * zoomStep) % (2 * (zoomMax - zoomMin))
      const z = phase < (zoomMax - zoomMin) ? zoomMin + phase : zoomMax - (phase - (zoomMax - zoomMin))
      sankey.setZoomScale(z, z, 0)
    } else {
      container.render(0)
    }
    // Wait for next animation frame so layout + paint happens within this iteration
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    renderTimes.push(performance.now() - r0)
  }

  const tEnd = performance.now()
  stopFrames = true
  observer?.disconnect()
  const memAfter = (performance as unknown as { memory?: Mem }).memory?.usedJSHeapSize ?? 0
  const elapsed = tEnd - tStart

  renderTimes.sort((a, b) => a - b)
  const mean = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
  const p50 = renderTimes[Math.floor(renderTimes.length * 0.5)]
  const p95 = renderTimes[Math.floor(renderTimes.length * 0.95)]
  const max = renderTimes[renderTimes.length - 1]

  const result = {
    mode: MODE,
    scenario: SCENARIO,
    n: N,
    nodes: data.nodes.length,
    links: data.links.length,
    elapsedMs: Math.round(elapsed),
    fps: +(frames / (elapsed / 1000)).toFixed(1),
    render: {
      meanMs: +mean.toFixed(2),
      p50Ms: +p50.toFixed(2),
      p95Ms: +p95.toFixed(2),
      maxMs: +max.toFixed(2),
    },
    longTasks: {
      count: longTasks.length,
      totalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(2),
      maxMs: longTasks.length ? +Math.max(...longTasks).toFixed(2) : 0,
    },
    heap: {
      beforeMb: +(memBefore / 1024 / 1024).toFixed(2),
      afterMb: +(memAfter / 1024 / 1024).toFixed(2),
      deltaMb: +((memAfter - memBefore) / 1024 / 1024).toFixed(2),
    },
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  ;(window as unknown as { __BENCH__: unknown }).__BENCH__ = result
  resultsEl.textContent = JSON.stringify(result, null, 2)
  setStatus('done')
}

main().catch(e => {
  setStatus(`failed: ${(e as Error).message}`)
  resultsEl.textContent = (e as Error).stack ?? String(e)
})
