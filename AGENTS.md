# AGENTS.md

Guidance for AI agents working in the Unovis monorepo. Each section below is self-contained;
more sections will be added over time.

---

## Building a New Component

This section is the playbook for adding a new visualization component (the worked example is the
`Boxplot` XY component). Read it fully before writing code.

### 0. Start by studying a sibling

Don't invent structure — copy the closest existing component and adapt it.
- **XY components** (plotted against x/y axes inside `XYContainer`): study `packages/ts/src/components/stacked-bar` and `packages/ts/src/components/line`.
- Reuse the existing utilities instead of re-implementing: `getNumber`, `getValue`, `getString`, `getColor`, `getMin`/`getMax`/`getExtent` (`utils/data`, `utils/color`), `roundedRectPath` (`utils/path`), `smartTransition` (`utils/d3`), `clamp`.

### 1. Component anatomy — `packages/ts/src/components/<name>/`

Four files, mirroring every other component:

- **`config.ts`** — `XxxConfigInterface<Datum> extends XYComponentConfigInterface<Datum>` + a `XxxDefaultConfig` that spreads `XYComponentDefaultConfig`. Every config field gets a doc comment ending in `Default: ...`.
- **`types.ts`** — the internal per-datum render record.
- **`style.ts`** — emotion styles + CSS variables (see the CSS section below).
- **`index.ts`** — `class Xxx<Datum> extends XYComponentCore<Datum, XxxConfigInterface<Datum>>` with `static selectors = s`, `_defaultConfig`, `config`, `events`, a constructor, `_render`, and any overridden extent methods.

Then export from `packages/ts/src/components.ts` — **both** the class (`export { Xxx } from './components/xxx'`) and the config type (`export type { XxxConfigInterface } from './components/xxx/config'`).

### 2. Accessors — design them around the visual elements (key learning)

- **Group accessors that feed one visual element together; keep genuinely independent elements independent.** A box-and-whisker has three accessors, not one `y` and not five scalars:
  - `median` → `NumericAccessor` (a single value)
  - `quartiles` → `GenericAccessor<[number, number]>` (`[q1, q3]` — the box)
  - `whiskers` → `GenericAccessor<[number, number]>` (`[min, max]`)

  Grouping `quartiles`/`whiskers` as tuples guarantees a box always has *both* edges — it can never render half-drawn. (Five independent scalars would allow that.)
- **But wire each accessor to its element independently where it's geometrically sound.** A `median` is just a line at a value, so it renders on its own with no box. A `whisker`, however, extends from the box edges (`q1`/`q3`), so it legitimately requires `quartiles`. Decide per-element; don't blanket-couple everything to one "primary" accessor.
- **The internal render record follows the config's naming and reuses the tuple references** (don't flatten `quartiles` into `q1`/`q3`) — it reads clearly and avoids extra allocations:
  ```ts
  export type BoxplotDataRecord<D> = {
    datum: D; index: number;
    median: number | null | undefined;
    quartiles: [number, number] | null | undefined;
    whiskers: [number, number] | null | undefined;
  }
  ```
- **Override the extent methods** (`getXDataExtent`, `getYDataExtent`, and component-specific helpers like `getValueScaleExtent`/`getDataScaleExtent`) so the scales fit *all* the accessor values, not the inherited single `y`.

### 3. Rendering & transitions (hard rules, learned from review)

- **Enter via opacity, never animate position from zero.** Place entering elements at their *final* geometry immediately (`smartTransition(sel, 0)`), set the group's `opacity: 0`, then transition the group `opacity → 1`. Animate geometry only on the *update* selection. Lines/shapes sliding in from `0,0` looks broken.
- **Toggle visibility with a transitioned `opacity`, not `display` + geometry guarded inside `if (hasX)`.** If you only write geometry inside the `if`, a part whose data disappears on update keeps **stale geometry** behind it. Instead, *every render* set `opacity` for every sub-element (`present ? 1 : 0`) so a vanished part fades out, and update geometry only when present:
  ```ts
  const t = smartTransition(sel, duration).style('opacity', hasX ? 1 : 0)
  if (hasX) t.attr('d', ...)   // or x1/y1/...
  ```
- **No forced reflow.** Do not call `getComputedStyle`, read `getBBox`, etc. in the render path. If a value seems to need it, redesign — simplify the visual instead.
- **No `@ts-ignore` / `@ts-expect-error` / `eslint-disable`.** These are red flags; fix the cause. If a typed scale doesn't expose a method (e.g. `bandwidth` on `ContinuousScale`), it usually means the branch is dead code — `XYComponent` only supports continuous scales, so delete it rather than suppress the error.

### 4. Sizing & layout (the bar-width ↔ bleed trap)

- For bar-like widths, use the **simple, stable count-based heuristic** (`(1 - barPadding) * _width / slots`, like `StackedBar`). It never collapses.
- **Do NOT compute width from the live (bled) scale range.** `barWidth → bleed → scale range → barWidth` is a feedback loop; for a domain narrower than the data step it oscillates and **collapses the plot to a sliver**. Sizing off `_width` (a stable input) avoids this. Accepted trade-off: at extreme zoom, edge boxes overlap/clip rather than the whole chart collapsing — simpler and predictable.
- **`_getVisibleData` should filter strictly to the domain** (render an element only when its *center* is in view). Don't widen the filter by half an element to catch edge-straddlers — the `bleed` getter already reserves room so edge elements aren't clipped. Widening it just drags in out-of-domain elements and inflates the bleed.
- **Keep `dataStep` as an explicit config override.** When data has missing points you *cannot* infer the step from the data (the smallest observed gap may exceed the true step), so the user must be able to state it.

### 5. CSS variables & styling

- **All visual styling (colors, stroke widths, opacity, cursor) goes through CSS variables — not config props.** Use the current pattern from `packages/ts/src/components/axis/style.ts`, not the old hand-written `injectGlobal` block:
  ```ts
  import { getCssVarNames, injectGlobalCssVariables } from 'utils/style'

  export const cssVarDefaults: Record<string, string | undefined> = {
    '--vis-xxx-fill-color': 'var(--vis-color-main)',
    // ...
    '--vis-dark-xxx-fill-color': 'var(--vis-color-main)', // dark-theme overrides, auto-wired
  }
  export const variables = getCssVarNames(cssVarDefaults)
  injectGlobalCssVariables(cssVarDefaults, root)   // injects :root + body.theme-dark .root automatically
  ```
  Reference vars in rules as `var(${variables.xxxFillColor})`. `injectGlobalCssVariables` handles the `--vis-dark-*` → `--vis-*` mapping under `body.theme-dark .${root}` for you.

### 6. Framework wrappers (generated — with two manual gotchas)

1. Register the component in **`packages/shared/integrations/components.ts`** — the single source of truth for wrapper generation. One line, e.g.:
   ```ts
   { name: 'Boxplot', sources: [coreComponentConfigPath, xyComponentConfigPath, '/components/boxplot'], dataType: 'Datum[]', angularProvide: 'VisXYComponent' },
   ```
2. Run `pnpm generate` in each framework package (`react`, `angular`, `svelte`, `solid`, `vue`). Kebab-case name defaults from the PascalCase `name`.
3. **Gotcha — barrels:** the generator updates the `components.ts` barrel for **svelte/vue/solid** but **NOT for react and angular** — add the export there by hand (`packages/react/src/components.ts`, `packages/angular/src/components.ts`).
4. **Gotcha — churn:** `pnpm generate` regenerates *all* wrappers, so unrelated files may show diffs (formatting, or a prop another component gained since the last gen). Revert the unrelated ones (`git checkout -- ...`) to keep the change focused; commit only your component's wrappers + the barrel edits.

### 7. Dev examples — `packages/dev/src/examples/xy-components/<name>/`

- Auto-discovered via `require.context` (no registry edit). A folder with `index.tsx` that exports either `title`/`subTitle`/`component`, or a `transitionComponent` for the data-transition harness. The sidebar category is the parent folder name.
- Add a data generator to `packages/dev/src/utils/data.ts` if needed.
- Build a range of examples that exercise real behavior: basic, a brush/navigational variant, a data-transition variant, and **partial/missing-data updates** (so element add/remove transitions are visible).

### 8. Gallery example & docs

- **Gallery:** `packages/shared/examples/<basic-name>/` — a full per-framework file set mirroring `packages/shared/examples/basic-line-chart/` (`.ts`, `.tsx`, `-solid.tsx`, `.vue`, `.svelte`, `.component.{ts,html}`, `.module.ts`, `data.ts`, `index.tsx`). Register it in `examples-list.tsx`. It **requires** preview PNGs in `_previews/<name>.png` (+ `-dark`); the website build fails without them — these are normally regenerated by the maintainer's tooling.
- **Docs:** `packages/website/docs/xy-charts/<Name>.mdx`, auto-registered in the sidebar. `<PropsTable name="Vis<Name>"/>` is populated by react-docgen scanning the generated react wrapper, so the wrapper must exist first.

### 9. Verifying your work (don't trust types alone here)

- **Canonical typecheck = the ts package's rollup build:** `pnpm --filter @unovis/ts build` (or `npm run forcebuild` in `packages/ts`). The package pins TypeScript ~4.2.4.
- **The dev app's `tsc --noEmit` is noisy and NOT a gate:** it runs the `@unovis/ts` source under a newer/stricter TS than the package targets, and the path aliases aren't resolved — every component shows errors. Likewise `eslint` on a component subdir emits `import/no-unresolved` for path aliases. Filter both out; only non-alias errors matter.
- **The dev app aliases `@unovis/ts` and `@unovis/react` to source** (webpack), so HMR reflects ts-package edits live — no rebuild needed to preview. The **website** aliases `@unovis/ts` to `dist`, so rebuild `dist` before checking docs.
- **Always confirm in the running app**, not just tests: render the example, watch the transitions, toggle dark theme, and try edge cases (narrow domains, missing data, single data point).

---

## Repository Map

pnpm workspace (`pnpm@10`, Node ≥18). Packages and how they relate:

| Package | Published as | Role |
| --- | --- | --- |
| `packages/ts` | `@unovis/ts` | **Core library, source of truth.** All components, containers, data models, `utils/`, `types/`, `styles/`. Framework-agnostic. |
| `packages/react` | `@unovis/react` | React wrappers — **generated** from `ts` + `shared`. Depends on `@unovis/ts`. |
| `packages/angular` | `@unovis/angular` | Angular wrappers — generated. Depends on `@unovis/ts`. |
| `packages/svelte` | `@unovis/svelte` | Svelte wrappers — generated. Depends on `@unovis/ts`. |
| `packages/vue` | `@unovis/vue` | Vue wrappers — generated. Depends on `@unovis/ts`. |
| `packages/solid` | `@unovis/solid` | Solid wrappers — generated. Depends on `@unovis/ts`. |
| `packages/shared` | *(not published)* | Two jobs: `integrations/components.ts` (the metadata that drives wrapper generation) and `examples/` (the Gallery examples consumed by the website). |
| `packages/dev` | *(not published)* | Internal playground/dev app (webpack). Hosts the example browser and the Cypress/Percy tests. Aliases `@unovis/ts` **and** `@unovis/react` to **source**. |
| `packages/website` | *(not published)* | Docusaurus docs site. Aliases `@unovis/ts` to **`dist`**. |

**Dependency direction:** `ts` is the root. The five framework packages wrap `ts`. `shared/integrations` feeds the wrapper generators; `shared/examples` feeds the website Gallery and the dev app. `dev` and `website` consume `ts` (and `react`). Nothing depends back on `dev`/`website`/`shared`.

---

## Build, Test & Lint Commands

**Build**
- Everything, in dependency order: `pnpm build` (ts → react → angular → svelte → vue → solid → website).
- A single package: `pnpm build:ts` (or `:react`, `:angular`, …) from root, or `cd packages/ts && pnpm build`.
- The `ts` build is incremental (hashes `src/`); force a clean rebuild with `npm run forcebuild` in `packages/ts`. It runs Rollup + `rollup-plugin-typescript2` and emits `dist/`.

**The TypeScript 4.2.4 quirk** (read before trusting any type error)
- The repo pins `typescript ~4.2.4` (root `devDependencies`), and that's what the `ts` build typechecks with.
- Running a **modern/global `tsc`** over the tree (or `packages/dev`'s `tsc --noEmit`) floods unrelated errors — newer `@types/node` syntax the old parser rejects, plus unresolved path aliases. **These are not real.** The **canonical typecheck is the `ts` package's Rollup build.**
- `eslint` run on a single component subdir reports `import/no-unresolved` for the `core/`, `utils/`, … aliases (the resolver is configured at the root). Run `pnpm lint` from root, or filter that rule out when scoping to a subdir.

**Lint**
- Root: `pnpm lint` / `pnpm lint:fix` — ESLint (`eslint-config-standard`) over `.js,.jsx,.ts,.tsx,.svelte`.
- A Husky pre-commit hook runs `lint-staged` (auto-fix on staged files). Don't bypass it.

**Test**
- Cypress + Percy live in `packages/dev`. Specs: `packages/dev/cypress/e2e/*.cy.ts`, base URL `http://localhost:9501`.
- Run: build & serve the dev app (`pnpm build:dev` then `cd packages/dev && pnpm serve`), then `cd packages/dev && pnpm test` (= `percy exec -- cypress run`). Percy visual snapshots need `PERCY_TOKEN`; without it Cypress still runs functionally.

---

## Conventions

**Code style** — `eslint-config-standard`: 2-space indent, **no semicolons**, single quotes, space before function parens. Let `lint:fix` / the pre-commit hook format; don't fight it.

**Imports (inside `@unovis/ts`)** — use the bare path aliases defined in `packages/ts/tsconfig.json`: `core/*`, `utils/*`, `types/*`, `components/*`, `styles/*`, `data-models/*` (e.g. `import { getNumber } from 'utils/data'`). Group imports under comment headers as the existing components do: `// Core`, `// Utils`, `// Types`, `// Local Types`, `// Config`, `// Styles`.

**CSS variables** — naming is `--vis-<component>-<property>` (e.g. `--vis-boxplot-fill-color`), with a dark-theme twin `--vis-dark-<component>-<property>`. Shared palette tokens (`--vis-color-main`, …) are the fallbacks. Declare them in the component's `cssVarDefaults` map and inject with `injectGlobalCssVariables` (handles `:root` + the `body.theme-dark .<root>` mapping). Never hand-roll a `body.theme-dark` block.

**Accessor typing** — from `types/accessor`: `NumericAccessor`, `StringAccessor`, `ColorAccessor`, `BooleanAccessor`, and `GenericAccessor<ReturnType, Datum>`. Each is `value | ((d, i, ...rest) => value | null | undefined)`. Read them with `getNumber` / `getString` / `getColor` / `getBoolean` / `getValue` (`utils/data`, `utils/color`) — never call the accessor directly. Config interfaces extend `XYComponentConfigInterface<Datum>` (or `ComponentConfigInterface`); every field is optional, documented, and ends its doc with `Default: ...`, and has a matching entry in the `XxxDefaultConfig`.

---

## Releasing / Versioning

- **No changesets.** All packages share a **single version** (root `package.json` is the reference, e.g. `1.6.5`).
- Bump with `pnpm update-version` (interactive `update-version.sh`): perl-replaces the version across every `package.json`, including `website`/`dev`, and updates the `@unovis/ts` peer-dependency pin in the wrapper packages.
- Each package builds to a `dist/` (the `ts` build also writes a cleaned `dist/package.json`). Publishing is from `dist`: `pnpm publish:all` (or per package: `publish:ts`, `publish:react`, …). Pre-release: `pnpm publish:all:beta` (publishes with `--tag beta`).
- **Commit messages: Conventional Commits**, enforced by `commitlint` (`@commitlint/config-conventional`) via the Husky `commit-msg` hook — e.g. `feat(boxplot): add component`, `fix(axis): …`, `docs: …`.

---

## Preview-Image Generation

> ⚠️ Open item — confirm the official workflow with the maintainers.

Each Gallery example's `index.tsx` does `require('../_previews/<name>.png')` (plus a `-dark` variant), and these are **committed static assets** — the **website build fails if they're missing**. Existing previews are ~`1134×1148` PNGs.

There is **no preview-generation script in the repo** (no puppeteer/playwright/screenshot job under `scripts/` or the website). So today this is a **manual/maintainer step** — capture the example rendered in the Gallery, light theme and dark theme, at the standard size. When adding an example, if you can't produce real previews, a placeholder unblocks the build but **must be flagged and replaced** before merge.

*(If/when an official generator is added, document the command here.)*

---

## PR Hygiene

- **Keep generated-wrapper churn out of the diff.** `pnpm generate` regenerates **all** wrappers, so unrelated files often show formatting-only or unrelated-prop diffs. `git checkout -- <those>` and commit only: your component's wrapper directories, the **manual** React/Angular barrel exports (`packages/react/src/components.ts`, `packages/angular/src/components.ts`), and the `shared/integrations/components.ts` entry.
- **Conventional Commit messages** (commitlint will reject otherwise). Lint must pass (the pre-commit hook auto-fixes staged files).
- **Update docs and add a Gallery example** when you add/​change public config or methods (per `CONTRIBUTING.md`).
- Branch from `main`; external contributors must sign the F5 CLA (a bot prompts on first PR).
