# Text measurement benchmark

Page-level benchmark comparing the new canvas-based text measurement (pretext)
against the legacy ratio-based fallback. Launches Chromium via Playwright,
renders a Sankey with synthetic data, and reports per-frame timing, FPS,
long tasks, and heap usage.

## One-time setup

From `packages/ts/`:

```sh
npm install                       # installs vite + @playwright/test
npx playwright install chromium   # ~90 MB browser binary, cached system-wide
```

## Running

From `packages/ts/`:

```sh
# Default: zoom scenario, N=100 iterations
npm run bench

# Tune iteration count and scenario
BENCH_N=1000 BENCH_SCENARIO=wrap npm run bench
BENCH_N=500  BENCH_SCENARIO=zoom npm run bench
BENCH_N=500  BENCH_SCENARIO=render npm run bench
```

Output is printed to stdout — each run prints two JSON blocks (ratio mode,
pretext mode) and a diff table at the end.

## Scenarios

| `BENCH_SCENARIO` | What it exercises | Where the speedup lives |
|---|---|---|
| `render` | Same data re-rendered N times in trim mode | None — text measurement isn't the bottleneck here |
| `zoom`   | Programmatic zoom oscillation (trim mode) | None for the same reason |
| `wrap`   | `labelFit: Wrap` + `labelForceWordBreak` so every label runs `wrapSVGText` | **~30% mean render reduction, ~40% FPS gain** |

The wrap scenario is the one that shows pretext earning its keep — `wrapSVGText`
in ratio mode uses `getComputedTextLength()` per word, which forces a synchronous
layout reflow. Pretext skips the DOM entirely. The trim scenarios show that
pretext is not a regression where the speedup doesn't apply.

## What the metrics mean

- `meanMs` / `p50Ms` / `p95Ms` / `maxMs` — per-render wall-clock (one `setZoomScale` or `render(0)` plus one rAF wait)
- `fps` — total rAF callbacks divided by elapsed seconds. Headless Chrome can exceed 60.
- `longTasks` — `PerformanceObserver` entries of type `longtask` (>50 ms blocking)
- `heap.deltaMb` — `performance.memory.usedJSHeapSize` after - before. Negative deltas mean GC fired and pretext's segment cache stabilized below the starting baseline.

Chromium is launched with `--enable-precise-memory-info` so heap numbers are
real bytes, not bucketed.

## A/B mechanism

Pretext can be disabled at runtime by setting `globalThis.UNOVIS_FORCE_RATIO_MEASUREMENT = true`
before the chart renders — `measureTextWidth` returns `null` and the utilities
fall back to the ratio formula. The bench page sets this flag based on the
`?mode=ratio` URL parameter; the Playwright test loads each mode separately.

## Quick result interpretation

Run `BENCH_N=1000 BENCH_SCENARIO=wrap npm run bench`. You should see roughly:

- `meanMs`: ratio ≈ 28 ms, pretext ≈ 20 ms (≈ -30%)
- `fps`:    ratio ≈ 35,    pretext ≈ 50    (≈ +40%)
- `heap.deltaMb`: small for both after GC settles

Numbers will vary with CPU, browser version, and what else your machine is
doing. The relative gap (≈ 30% / 40%) is what reproduces consistently.
