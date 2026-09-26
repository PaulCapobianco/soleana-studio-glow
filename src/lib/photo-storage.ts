import { supabase } from "@/integrations/supabase/client";

/**
 * INTERRUPTEUR UNIQUE de la lecture des galeries depuis Supabase Storage.
 * Désactivé par défaut : le site continue d'afficher les fichiers locaux, à l'identique.
 * À activer (VITE_GALLERIES_FROM_STORAGE=true au build) seulement après application de la migration
 * photo_variants / photo_placements ET import complet des photos.
 */
export const STORAGE_GALLERIES_ENABLED = import.meta.env.VITE_GALLERIES_FROM_STORAGE === "true";

const BUCKET = "photos";

/**
 * Seul endroit qui construit l'URL publique d'une image stockée. Pour passer par un sous-domaine
 * Cloudflare (cache), définir VITE_IMAGE_BASE_URL (ex. https://images.soleanastudio.fr) : les
 * composants n'ont pas à changer. Sans cette variable, on utilise l'URL publique du bucket Supabase.
 */
export function publicImageUrl(storagePath: string): string {
  const base = import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${storagePath}`;
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export type StorageGalleryPhoto = {
  id: string;
  image_url: string;
  srcset: string;
  alt_text: string;
  location: null;
  title: null;
  display_order: number;
  object_position: string;
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
    photo_variants: { width: number; height: number; storage_path: string }[];
  } | null;
};

/** Emplacements lus en base -> photos par galerie (slot), prêtes pour CategoryGallerySection. */
export function buildStorageGalleries(rows: PlacementRow[]): Record<string, StorageGalleryPhoto[]> {
  const bySlot: Record<string, StorageGalleryPhoto[]> = {};
  const ordered = [...rows].sort((a, b) => a.display_order - b.display_order);
  for (const row of ordered) {
    const variants = [...(row.photo?.photo_variants ?? [])].sort((a, b) => a.width - b.width);
    if (!row.photo || variants.length === 0) continue;
    const largest = variants[variants.length - 1];
    (bySlot[row.slot] ??= []).push({
      id: row.photo.id,
      image_url: publicImageUrl(largest.storage_path),
      srcset: variants.map((v) => `${publicImageUrl(v.storage_path)} ${v.width}w`).join(", "),
      // Texte de l'emplacement s'il existe, sinon celui de la photo.
      alt_text: row.alt_text_override ?? row.photo.alt_text,
      location: null,
      title: null,
      display_order: row.display_order,
      object_position: `${Number(row.object_position_x_pct)}% ${Number(row.object_position_y_pct)}%`,
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
    const { data, error } = await supabase
      .from("photo_placements")
      .select(
        "slot, display_order, alt_text_override, object_position_x_pct, object_position_y_pct, photo:photos!inner(id, alt_text, photo_variants(width, height, storage_path))",
      )
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
