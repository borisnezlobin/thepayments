export function sizedName(baseName: string, sizeLabel: string | null, sizeIndex: number) {
  return `${baseName} (${sizeLabel ?? `size ${sizeIndex + 1}`})`;
}
