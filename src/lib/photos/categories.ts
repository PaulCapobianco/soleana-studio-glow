import { AdminValidationError } from "@/lib/admin/friendly-error";
import { slugify } from "@/lib/events/validation";

// Catégories lues par le code du site (galeries des pages SEO, portfolio) : jamais supprimées.
// Liste identique à celle du trigger de 20261109000000_photo_categories_management.sql.
export const PROTECTED_CATEGORY_SLUGS: readonly string[] = [
  "grossesse",
  "famille",
  "couple",
  "portrait",
  "evenement",
];

export type CategoryLike = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
};

export function validateCategoryName(name: string): string | null {
  const clean = name.trim();
  if (!clean) return "Donnez un nom à la catégorie.";
  if (clean.length > 80) return "Ce nom est trop long (80 caractères maximum).";
  if (!slugify(clean)) return "Ce nom doit contenir au moins une lettre ou un chiffre.";
  return null;
}

/** Adresse interne d'une nouvelle catégorie : « Mariage en été » → mariage-en-ete, puis -2, -3… si prise. */
export function categorySlugFor(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = (slugify(name) || "categorie").slice(0, 56).replace(/-+$/, "");
  if (!used.has(root)) return root;
  for (let n = 2; n < 1000; n += 1) {
    if (!used.has(`${root}-${n}`)) return `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Déplace une catégorie d'un cran (delta -1 = vers le haut) et renvoie les nouveaux ordres 1..n,
 * seulement pour les lignes qui changent. null si le déplacement est impossible.
 */
export function moveCategory(
  list: readonly CategoryLike[],
  id: string,
  delta: -1 | 1,
): { id: string; display_order: number }[] | null {
  const sorted = [...list].sort(
    (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
  );
  const index = sorted.findIndex((c) => c.id === id);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= sorted.length) return null;
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return sorted
    .map((c, i) => ({ id: c.id, display_order: i + 1, previous: c.display_order }))
    .filter((c) => c.display_order !== c.previous)
    .map(({ id: categoryId, display_order }) => ({ id: categoryId, display_order }));
}

/** Pourquoi une catégorie ne peut pas être supprimée (null = suppression possible). */
export function deleteBlockReason(category: CategoryLike, photoCount: number): string | null {
  if (PROTECTED_CATEGORY_SLUGS.includes(category.slug)) {
    return "Cette catégorie est utilisée par le site : vous pouvez la masquer, pas la supprimer.";
  }
  if (photoCount > 0) {
    return `Elle contient encore ${photoCount} photo${photoCount > 1 ? "s" : ""} : déplacez-les ou masquez la catégorie.`;
  }
  return null;
}

/** Messages des garde-fous de la base (déjà en français) et clés étrangères, rendus lisibles. */
export function categoryError(error: unknown): unknown {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === "P0001" && e.message) return new AdminValidationError(e.message);
  if (e?.code === "23503") {
    return new AdminValidationError(
      "Cette catégorie est encore utilisée par des photos de galerie : masquez-la plutôt.",
    );
  }
  if (e?.code === "23505") {
    return new AdminValidationError("Une catégorie avec cette adresse existe déjà.");
  }
  return error;
}
