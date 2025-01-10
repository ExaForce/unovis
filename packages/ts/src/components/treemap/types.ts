import { HierarchyRectangularNode } from 'd3-hierarchy'

export type TreemapDatum<Datum> = {
  datum: Datum;
  index: number;
}

export interface TreemapNode<Datum> extends HierarchyRectangularNode<TreemapDatum<Datum>> {
  _id: string;
  _fill?: string;
  _fillOpacity?: number | null;
}
