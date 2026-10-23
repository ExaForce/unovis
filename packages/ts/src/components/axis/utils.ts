// Types
import { Position } from '@/types/position'

// Local Types
import { AxisType } from './types'

// Config
import { AxisConfigInterface } from './config'

/** The side of the chart an axis sits on. A position that doesn't apply to the axis type (e.g. `left` for an X axis)
 * puts the axis on the default side, while its labels still get placed by that position (see `Axis.getPosition`) */
export function getAxisSide ({ type, position }: Pick<AxisConfigInterface<unknown>, 'type' | 'position'>): Position {
  if (type === AxisType.X) return position === Position.Top ? Position.Top : Position.Bottom
  return position === Position.Right ? Position.Right : Position.Left
}
