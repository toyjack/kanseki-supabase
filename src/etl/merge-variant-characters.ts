export type VariantSource = "univariants" | "opencc";

export interface VariantCharacter {
  target: string;
  normalized: string;
  source: VariantSource;
}

/** OpenCCを基礎とし、同一targetではUniVariantsを優先して統合する。 */
export function mergeVariantCharacters(
  univariants: readonly Omit<VariantCharacter, "source">[],
  opencc: readonly Omit<VariantCharacter, "source">[],
): readonly VariantCharacter[] {
  const merged = new Map<string, VariantCharacter>();

  for (const entry of opencc) {
    merged.set(entry.target, { ...entry, source: "opencc" });
  }
  for (const entry of univariants) {
    merged.set(entry.target, { ...entry, source: "univariants" });
  }

  return [...merged.values()];
}
