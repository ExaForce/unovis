import { Position } from '@/types/position'
import { SymbolType } from '@/types/symbol'

export type ScatterPoint<D> = D & {
  _point: {
    xValue: number;
    yValue: number;
    sizePx: number;
    color: string | null;
    mask: string | null;
    strokeColor: string | null;
    strokeWidthPx: number | null;
    shape: SymbolType | string;
    label: string | null;
    labelColor: string | null;
    labelPosition: Position | null;
    labelPositions?: Position[];
    cursor: string | null;
    groupIndex: number;
    pointIndex: number;
    xOffsetPx: number;
    yOffsetPx: number;
  };
}

export type ScatterPointGroupNode = SVGGElement & {
  _labelVisible: boolean;
  _labelPosition?: Position;
  _renderedLabelPosition?: Position;
  _forceShowLabel?: boolean;
}
