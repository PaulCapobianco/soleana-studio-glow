import { getSupabase } from "@/lib/supabase-lazy";
import { publicImageUrl } from "@/lib/photos/public-url";
import { matchedAvifWebp } from "@/lib/photos/variants";

export type StorageGalleryPhoto = {
  id: string;
  image_url: string;
  srcset: string;
  avif_srcset: string;
  webp_srcset: string;
  alt_text: string;
  location: null;
  title: null;
  display_order: number;
  object_position: string;
  /** Dimensions de la plus grande variante (évite tout décalage de mise en page). */
  width: number;
  height: number;
};

type PlacementRow = {
  slot: string;
  display_order: number;
  alt_text_override: string | null;
  object_position_x_pct: number | string;
  object_position_y_pct: number | string;
  photo: {
    id: string;
    alt_text: string;
    photo_variants: { width: number; height: number; storage_path: string; format: string }[];
  } | null;
};

const PLACEMENT_SELECT =
  "slot, display_order, alt_text_override, object_position_x_pct, object_position_y_pct, photo:photos!inner(id, alt_text, photo_variants(width, height, storage_path, format))";

/** Emplacements lus en base -> photos par galerie (slot), prêtes pour CategoryGallerySection. */
export function buildStorageGalleries(rows: PlacementRow[]): Record<string, StorageGalleryPhoto[]> {
  const bySlot: Record<string, StorageGalleryPhoto[]> = {};
  const ordered = [...rows].sort((a, b) => a.display_order - b.display_order);
  for (const row of ordered) {
    const variants = row.photo?.photo_variants ?? [];
    // Une photo incomplète ne doit pas rendre une galerie partiellement utilisable.
    const pair = matchedAvifWebp(variants);
    if (!row.photo || !pair) continue;
    const { avif, webp } = pair;
    const largest = webp[webp.length - 1];
    const sourceSet = (items: typeof webp) =>
      items
        .map((variant) => `${publicImageUrl(variant.storage_path)} ${variant.width}w`)
        .join(", ");
    (bySlot[row.slot] ??= []).push({
      id: row.photo.id,
      image_url: publicImageUrl(largest.storage_path),
      srcset: sourceSet(webp),
      avif_srcset: sourceSet(avif),
      webp_srcset: sourceSet(webp),
      // Texte de l'emplacement s'il existe, sinon celui de la photo.
      alt_text: row.alt_text_override ?? row.photo.alt_text,
      location: null,
      title: null,
      display_order: row.display_order,
      object_position: `${Number(row.object_position_x_pct)}% ${Number(row.object_position_y_pct)}%`,
      width: largest.width,
      height: largest.height,
    });
  }
  return bySlot;
}

/**
 * Galeries d'une page SEO lues en base (emplacements publiés, RLS publique). Ne lève jamais :
 * en cas d'erreur ou de table absente, retourne null et le site garde les fichiers locaux.
 */
export async function loadStorageGalleries(
  seoPageId: string,
): Promise<Record<string, StorageGalleryPhoto[]> | null> {
  try {
    const { data, error } = await (
      await getSupabase()
    )
      .from("photo_placements")
      .select(PLACEMENT_SELECT)
      .eq("seo_page_id", seoPageId)
      .eq("context_type", "seo")
      .eq("published", true)
      .order("display_order");
    if (error || !data) {
      if (error)
        console.error(
          "[photo_placements] Lecture impossible, fichiers locaux utilisés.",
          error.message,
        );
      return null;
    }
    return buildStorageGalleries(data as unknown as PlacementRow[]);
  } catch (error) {
    console.error("[photo_placements] Lecture impossible, fichiers locaux utilisés.", error);
    return null;
  }
}

const CATEGORY_SEO_SLUG: Record<string, string> = {
  couple: "photographe-couple-marseille",
  famille: "photographe-famille-marseille",
  grossesse: "photographe-grossesse-marseille",
  portrait: "photographe-portrait-marseille",
};

/** Galeries (par slot) -> liste unique : slots dans l'ordre, une même photo une seule fois. */
export function flattenGalleries(
  galleries: Record<string, StorageGalleryPhoto[]>,
): StorageGalleryPhoto[] {
  const seen = new Set<string>();
  const out: StorageGalleryPhoto[] = [];
  for (const slot of Object.keys(galleries).sort((a, b) => a.localeCompare(b))) {
    for (const photo of galleries[slot]) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      out.push(photo);
    }
  }
  return out;
}

/**
 * Photos d'une page catégorie du portfolio (BUG-02) : toutes les photos publiées de la page SEO
 * correspondante, dédupliquées. null si la catégorie est inconnue ou en cas d'erreur.
 */
export async function loadCategoryPhotos(
  categorySlug: string,
): Promise<StorageGalleryPhoto[] | null> {
  const seoSlug = CATEGORY_SEO_SLUG[categorySlug];
  if (!seoSlug) return null;
  try {
    // Une seule requête (jointure sur la page SEO publiée) au lieu de deux requêtes en série.
    const { data, error } = await (
      await getSupabase()
    )
      .from("photo_placements")
      .select(`${PLACEMENT_SELECT}, seo_pages!inner(slug, published)`)
      .eq("seo_pages.slug", seoSlug)
      .eq("seo_pages.published", true)
      .eq("context_type", "seo")
      .eq("published", true)
      .order("display_order");
    if (error || !data) {
      if (error) console.error("[photo_placements] Lecture impossible (catégorie).", error.message);
      return null;
    }
    return flattenGalleries(buildStorageGalleries(data as unknown as PlacementRow[]));
  } catch (error) {
    console.error("[photo_placements] Lecture impossible (catégorie).", error);
    return null;
  }
}

/**
 * Galeries d'un événement (contexte `event`) : une galerie par `slot` (hero, intro, decor,
 * session-01…), la couverture d'une galerie étant son display_order 0. Mêmes règles que les pages
 * SEO : emplacements publiés seulement (RLS publique, événement publié), jamais d'exception, null
 * en cas d'erreur ou de table absente (le site garde alors ses images d'origine).
 */
export async function loadEventGalleries(
  eventId: string,
): Promise<Record<string, StorageGalleryPhoto[]> | null> {
  try {
    const { data, error } = await (
      await getSupabase()
    )
      .from("photo_placements")
      .select(PLACEMENT_SELECT)
      .eq("event_id", eventId)
      .eq("context_type", "event")
      .eq("published", true)
      .order("display_order");
    if (error || !data) {
      if (error) console.error("[photo_placements] Lecture impossible (événement).", error.message);
      return null;
    }
    return buildStorageGalleries(data as unknown as PlacementRow[]);
  } catch (error) {
    console.error("[photo_placements] Lecture impossible (événement).", error);
    return null;
  }
}
