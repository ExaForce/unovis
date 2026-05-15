import { css, injectGlobal } from '@emotion/css'

export const root = css`
  label: radial-bar-component;
`

export const variables = injectGlobal`
  :root {
    --vis-radial-bar-central-label-font-size: 32px;
    --vis-radial-bar-central-label-text-color: #5b5f6d;
    // Undefined by default to allow proper fallback to var(--vis-font-family)
    /* --vis-radial-bar-central-label-font-family: */
    --vis-radial-bar-central-label-font-weight: 600;

    --vis-radial-bar-central-sub-label-font-size: 12px;
    --vis-radial-bar-central-sub-label-text-color: #5b5f6d;
    // Undefined by default to allow proper fallback to var(--vis-font-family)
    /* --vis-radial-bar-central-sub-label-font-family: */
    --vis-radial-bar-central-sub-label-font-weight: 500;

    --vis-radial-bar-background-color: #E7E9F3;
    --vis-radial-bar-bar-stroke-width: 0;
    // The bar stroke color variable is not defined by default
    // to allow it to fallback to the background color
    /* --vis-radial-bar-bar-stroke-color: none; */

    --vis-dark-radial-bar-central-label-text-color: #C2BECE;
    --vis-dark-radial-bar-central-sub-label-text-color: #C2BECE;
    --vis-dark-radial-bar-background-color: #18160C;
  }

  body.theme-dark ${`.${root}`} {
    --vis-radial-bar-central-label-text-color: var(--vis-dark-radial-bar-central-label-text-color);
    --vis-radial-bar-central-sub-label-text-color: var(--vis-dark-radial-bar-central-sub-label-text-color);
    --vis-radial-bar-background-color: var(--vis-dark-radial-bar-background-color);
  }
`

export const background = css`
  label: background;
  fill: var(--vis-radial-bar-background-color);
`

export const bar = css`
  label: bar;
  stroke-width: var(--vis-radial-bar-bar-stroke-width);
  stroke: var(--vis-radial-bar-bar-stroke-color, var(--vis-radial-bar-background-color));
`

export const barExit = css`
  label: bar-exit;
`

export const centralLabel = css`
  label: central-label;
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: var(--vis-radial-bar-central-label-font-size);
  font-family: var(--vis-radial-bar-central-label-font-family, var(--vis-font-family));
  font-weight: var(--vis-radial-bar-central-label-font-weight);
  fill: var(--vis-radial-bar-central-label-text-color);
`

export const centralSubLabel = css`
  label: central-sub-label;
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: var(--vis-radial-bar-central-sub-label-font-size);
  font-family: var(--vis-radial-bar-central-sub-label-font-family, var(--vis-font-family));
  font-weight: var(--vis-radial-bar-central-sub-label-font-weight);
  fill: var(--vis-radial-bar-central-sub-label-text-color);
`
