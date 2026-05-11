import { test } from '@playwright/test'

const N = Number(process.env.BENCH_N || 100)
const SCENARIO = (process.env.BENCH_SCENARIO || 'zoom') as 'render' | 'zoom'

interface BenchResult {
  mode: string;
  scenario: string;
  n: number;
  nodes: number;
  links: number;
  elapsedMs: number;
  fps: number;
  render: { meanMs: number; p50Ms: number; p95Ms: number; maxMs: number };
  longTasks: { count: number; totalMs: number; maxMs: number };
  heap: { beforeMb: number; afterMb: number; deltaMb: number };
}

async function runMode (page: import('@playwright/test').Page, mode: 'pretext' | 'ratio'): Promise<BenchResult> {
  await page.goto(`/?mode=${mode}&n=${N}&scenario=${SCENARIO}`)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  await page.waitForFunction(() => (window as unknown as { __BENCH__?: unknown }).__BENCH__ !== undefined, null, { timeout: 4 * 60_000 })
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return page.evaluate(() => (window as unknown as { __BENCH__: BenchResult }).__BENCH__)
}

function diff (a: BenchResult, b: BenchResult): Record<string, string> {
  const pct = (x: number, y: number): string => {
    if (y === 0) return 'n/a'
    const d = ((x - y) / y) * 100
    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
  }
  return {
    elapsedMs: `${a.elapsedMs} → ${b.elapsedMs} (${pct(b.elapsedMs, a.elapsedMs)})`,
    fps: `${a.fps} → ${b.fps} (${pct(b.fps, a.fps)})`,
    meanMs: `${a.render.meanMs} → ${b.render.meanMs} (${pct(b.render.meanMs, a.render.meanMs)})`,
    p95Ms: `${a.render.p95Ms} → ${b.render.p95Ms} (${pct(b.render.p95Ms, a.render.p95Ms)})`,
    maxMs: `${a.render.maxMs} → ${b.render.maxMs} (${pct(b.render.maxMs, a.render.maxMs)})`,
    longTaskCount: `${a.longTasks.count} → ${b.longTasks.count}`,
    longTaskTotalMs: `${a.longTasks.totalMs} → ${b.longTasks.totalMs}`,
    heapDeltaMb: `${a.heap.deltaMb} → ${b.heap.deltaMb} (${pct(b.heap.deltaMb, a.heap.deltaMb)})`,
  }
}

test('text-measurement: pretext vs ratio', async ({ page }) => {
  test.setTimeout(5 * 60_000)
  // Run ratio first (no canvas measurement, baseline), then pretext.
  const ratio = await runMode(page, 'ratio')
  const pretext = await runMode(page, 'pretext')

  /*
   eslint-disable no-console
  */
  console.log(`\n=== ratio mode ===\n${JSON.stringify(ratio, null, 2)}`)
  console.log(`\n=== pretext mode ===\n${JSON.stringify(pretext, null, 2)}`)
  console.log(`\n=== diff (ratio → pretext) ===\n${JSON.stringify(diff(ratio, pretext), null, 2)}`)
})
