// Augment TS 4.2's lib.dom with the FontFaceSet API and Chrome's performance.memory.
interface FontFaceSet {
  ready: Promise<unknown>;
  load(font: string, text?: string): Promise<readonly unknown[]>;
}
interface Document {
  fonts?: FontFaceSet;
}
interface Performance {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
}
