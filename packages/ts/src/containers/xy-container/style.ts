import { css } from '@/styles/emotion'

// Keyboard navigation announcements: available to screen readers, but not displayed
export const liveRegion = css`
  label: xy-container-live-region;
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
