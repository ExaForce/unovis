import { SnapDirection } from '@/types/data'

export type CrosshairPointOffset = {
  circle: [number, number];
  lines: [number, number];
  direction?: SnapDirection;
}
