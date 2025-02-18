// Core
import { ContainerDefaultConfig, ContainerConfigInterface } from '@unovis/ts/core/container/config'
import { ComponentCore } from '@unovis/ts/core/component'
import { Tooltip } from '@unovis/ts/components/tooltip'
import { Annotations } from '@unovis/ts/components/annotations'

export interface SingleContainerConfigInterface<Datum> extends ContainerConfigInterface {
  /** Visualization component. Default: `undefined` */
  component?: ComponentCore<Datum>;
  /** Tooltip component. Default: `undefined` */
  tooltip?: Tooltip;
  /** Annotations component. Default: `undefined` */
  annotations?: Annotations | undefined;
}

export const SingleContainerDefaultConfig: SingleContainerConfigInterface<unknown> = {
  ...ContainerDefaultConfig,
  tooltip: undefined,
  annotations: undefined,
}
