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
  avif_srcset: string;
  webp_srcset: string;
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
    photo_variants: { width: number; height: number; storage_path: string; format: string }[];
  } | null;
};

/** Emplacements lus en base -> photos par galerie (slot), prêtes pour CategoryGallerySection. */
export function buildStorageGalleries(rows: PlacementRow[]): Record<string, StorageGalleryPhoto[]> {
  const bySlot: Record<string, StorageGalleryPhoto[]> = {};
  const ordered = [...rows].sort((a, b) => a.display_order - b.display_order);
  for (const row of ordered) {
    const variants = row.photo?.photo_variants ?? [];
    const avif = variants.filter((variant) => variant.format === "avif").sort((a, b) => a.width - b.width);
    const webp = variants.filter((variant) => variant.format === "webp").sort((a, b) => a.width - b.width);
    // Une photo incomplète ne doit pas rendre une galerie partiellement utilisable.
    if (!row.photo || avif.length === 0 || avif.length !== webp.length ||
        avif.some((variant, index) => variant.width !== webp[index].width)) continue;
    const largest = webp[webp.length - 1];
    const sourceSet = (items: typeof webp) =>
      items.map((variant) => `${publicImageUrl(variant.storage_path)} ${variant.width}w`).join(", ");
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
        "slot, display_order, alt_text_override, object_position_x_pct, object_position_y_pct, photo:photos!inner(id, alt_text, photo_variants(width, height, storage_path, format))",
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

export type BrowserPhotoVariant = {
  blob: Blob;
  format: "avif" | "webp";
  width: number;
  height: number;
  byte_size: number;
  sha256: string;
  storage_path: string;
};

// Charge l'encodeur mono-thread à la première photo admin. Le point d'entrée général de jSquash
// inclut un worker multithread que le build Vite de ce projet ne peut pas regrouper.
let avifEncoderPromise: Promise<{
  encode: (image: ImageData) => Uint8Array;
}> | undefined;

async function browserAvifEncoder() {
  avifEncoderPromise ??= (async () => {
    const [{ default: createModule }, { default: wasmUrl }, { defaultOptions }] = await Promise.all([
      import("@jsquash/avif/codec/enc/avif_enc.js"),
      import("@jsquash/avif/codec/enc/avif_enc.wasm?url"),
      import("@jsquash/avif/meta.js"),
    ]);
    const module = await createModule({ noInitialRun: true, locateFile: () => wasmUrl });
    return {
      encode(image: ImageData) {
        const result = module.encode(
          new Uint8Array(image.data.buffer), image.width, image.height,
          { ...defaultOptions, quality: 50 },
        );
        if (!result) throw new Error("L'encodage AVIF a échoué.");
        return result;
      },
    };
  })();
  return avifEncoderPromise;
}

/** Canvas peut conserver un profil ICC dans le conteneur WebP ; retirer ses chunks de métadonnées. */
async function stripWebpMetadata(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (text(0, 4) !== "RIFF" || text(8, 4) !== "WEBP") throw new Error("WebP invalide.");
  const input = new DataView(bytes.buffer);
  const chunks: Uint8Array[] = [];
  let total = 12;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error("WebP tronqué.");
    const name = text(offset, 4);
    const size = input.getUint32(offset + 4, true);
    const end = offset + 8 + size + (size & 1);
    if (end > bytes.length) throw new Error("WebP tronqué.");
    if (!["ICCP", "EXIF", "XMP "].includes(name)) {
      const chunk = bytes.slice(offset, end);
      if (name === "VP8X") chunk[8] &= ~(0x20 | 0x08 | 0x04);
      chunks.push(chunk);
      total += chunk.length;
    }
    offset = end;
  }
  const clean = new Uint8Array(total);
  clean.set(bytes.subarray(0, 12));
  new DataView(clean.buffer).setUint32(4, total - 8, true);
  let offset = 12;
  for (const chunk of chunks) {
    clean.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([clean], { type: "image/webp" });
}

/** Réencode dans le navigateur avant tout envoi : orientation appliquée, aucun original transféré. */
export async function generateBrowserPhotoVariants(
  file: File,
  sourceKey: string,
): Promise<BrowserPhotoVariant[]> {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type) || file.size > 25 * 1024 * 1024) {
    throw new Error("Choisissez une image JPG, PNG, WebP, AVIF ou HEIC de 25 Mo maximum.");
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 100_000_000) {
      throw new Error("Les dimensions de cette photo sont trop grandes.");
    }
    const widths = [...new Set([400, 800, 1600].map((width) => Math.min(width, bitmap.width)))];
    const encoder = await browserAvifEncoder();
    const variants: BrowserPhotoVariant[] = [];
    for (const width of widths) {
      const height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Le navigateur ne peut pas traiter cette photo.");
      context.drawImage(bitmap, 0, 0, width, height);
      const avifBytes = encoder.encode(context.getImageData(0, 0, width, height));
      const avifBlob = new Blob([Uint8Array.from(avifBytes)], { type: "image/avif" });
      const encodedWebp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
      if (!encodedWebp || encodedWebp.type !== "image/webp") {
        throw new Error("Ce navigateur ne peut pas produire le format WebP. Essayez un navigateur récent.");
      }
      const webpBlob = await stripWebpMetadata(encodedWebp);
      for (const [format, blob] of [["avif", avifBlob], ["webp", webpBlob]] as const) {
        const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        variants.push({
          blob,
          format,
          width,
          height,
          byte_size: blob.size,
          sha256,
          storage_path: `${sourceKey}/${sha256.slice(0, 8)}-${width}.${format}`,
        });
      }
      canvas.width = 0;
      canvas.height = 0;
    }
    return variants;
  } finally {
    bitmap.close();
  }
}
