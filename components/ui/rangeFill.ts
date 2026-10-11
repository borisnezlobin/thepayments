import type { CSSProperties } from "react";

export function rangeFill(value: number, min: number, max: number): CSSProperties {
  return { "--range-fill": `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
}
