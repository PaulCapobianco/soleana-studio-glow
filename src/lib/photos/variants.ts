// Règles communes sur les variantes d'une photo (AVIF et WebP, plusieurs largeurs). Lecture seule,
// sans accès réseau : utilisé par la lecture publique des galeries et par l'administration.

export type VariantLike = { format: string; width: number };

/** Variantes d'un format, de la plus étroite à la plus large. Ne modifie pas le tableau reçu. */
export function variantsOfFormat<T extends VariantLike>(
  variants: readonly T[] | null | undefined,
  format: "avif" | "webp",
): T[] {
  return (variants ?? []).filter((v) => v.format === format).sort((a, b) => a.width - b.width);
}

/** La plus large variante d'un format, ou undefined s'il n'y en a pas. */
export function largestVariant<T extends VariantLike>(
  variants: readonly T[] | null | undefined,
  format: "avif" | "webp",
): T | undefined {
  return variantsOfFormat(variants, format).at(-1);
}

/** Vrai si la photo possède au moins une variante AVIF et une variante WebP. */
export function hasBothFormats(variants: readonly VariantLike[] | null | undefined): boolean {
  const list = variants ?? [];
  return list.some((v) => v.format === "avif") && list.some((v) => v.format === "webp");
}

/**
 * Jeu AVIF + WebP utilisable pour un `<picture>` : mêmes largeurs dans les deux formats, au moins
 * une. null sinon (une photo incomplète ne doit pas rendre une galerie partiellement utilisable).
 */
export function matchedAvifWebp<T extends VariantLike>(
  variants: readonly T[] | null | undefined,
): { avif: T[]; webp: T[] } | null {
  const avif = variantsOfFormat(variants, "avif");
  const webp = variantsOfFormat(variants, "webp");
  if (avif.length === 0 || avif.length !== webp.length) return null;
  if (avif.some((variant, index) => variant.width !== webp[index].width)) return null;
  return { avif, webp };
}
