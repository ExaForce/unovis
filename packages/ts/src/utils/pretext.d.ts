export interface PreparedTextWithSegments {
  segments: string[];
  widths: number[];
}

export declare function prepareWithSegments(text: string, font: string): PreparedTextWithSegments;
export declare function measureNaturalWidth(prepared: PreparedTextWithSegments): number;
export declare function clearCache(): void;
