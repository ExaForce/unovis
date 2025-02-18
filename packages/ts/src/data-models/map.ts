// Core
import { CoreDataModel } from '@unovis/ts/data-models/core'

// Types
import { NumericAccessor } from '@unovis/ts/types/accessor'

// Utils
import { getDataLatLngBounds } from '@unovis/ts/utils/map'

export class MapDataModel<PointDatum> extends CoreDataModel<PointDatum[]> {
  getDataLatLngBounds (
    pointLatitude: NumericAccessor<PointDatum>,
    pointLongitude: NumericAccessor<PointDatum>,
    paddingDegrees = 1
  ): [[number, number], [number, number]] {
    return getDataLatLngBounds(this.data, pointLatitude, pointLongitude, paddingDegrees)
  }
}
