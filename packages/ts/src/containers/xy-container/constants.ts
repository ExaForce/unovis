/** Zoom exponent per unit of `WheelEvent.deltaY`, by `deltaMode` (pixels, lines, pages). The same values as in d3-zoom */
export const XY_ZOOM_WHEEL_DELTA_MULTIPLIERS = [0.002, 0.05, 1]

/** Trackpad pinch gestures come as `wheel` events with `ctrlKey` and small deltas, so we amplify them */
export const XY_ZOOM_PINCH_WHEEL_MULTIPLIER = 10

/** Maximum zoom exponent of a single `wheel` event (`2 ** 0.5` ≈ 1.41x), so a Ctrl + mouse wheel notch doesn't jump too far */
export const XY_ZOOM_WHEEL_MAX_EXPONENT = 0.5

/** Pixels per `WheelEvent.deltaX` unit when panning, by `deltaMode` (pixels, lines, pages) */
export const XY_ZOOM_WHEEL_PAN_MULTIPLIERS = [1, 16, 400]

/** Distance in pixels a mouse has to move with the button pressed before a drag starts panning */
export const XY_ZOOM_DRAG_THRESHOLD_PX = 3

/** By default, the X domain can't be narrower than this number of steps between neighboring data points */
export const XY_ZOOM_AUTO_MIN_SPAN_STEPS = 2

/** Zoom factor of the `+` and `-` keys */
export const XY_ZOOM_KEYBOARD_FACTOR = 1.5

/** `PageUp` and `PageDown` move the Crosshair by this fraction of the navigable data points */
export const XY_KEYBOARD_PAGE_FRACTION = 0.1

/** When keyboard navigation pans the zoomed chart, the active data point is kept this fraction of the domain away from the edge */
export const XY_KEYBOARD_PAN_PADDING = 0.05
