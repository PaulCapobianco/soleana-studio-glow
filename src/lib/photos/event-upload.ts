import { supabase } from "@/integrations/supabase/client";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import { largestVariant } from "@/lib/photos/variants";

type Variant = {
  storage_path: string;
  blob: Blob;
  format: "avif" | "webp";
  width: number;
  height: number;
  byte_size: number;
  sha256: string;
};

export type EventUploadDeps = {
  validate: (file: File) => Promise<unknown>;
  generate: (file: File, sourceKey: string) => Promise<Variant[]>;
  capacity: (
    additionalBytes: number,
  ) => Promise<{ canUpload: boolean; projectedPercent: number | null }>;
  client: typeof supabase;
};

async function realDeps(): Promise<EventUploadDeps> {
  const [storage, admin] = await Promise.all([
    import("@/lib/photos/browser-encoder"),
    import("@/lib/photos/storage-admin.functions"),
  ]);
  return {
    validate: storage.validatePhotoSource,
    generate: storage.generateBrowserPhotoVariants as EventUploadDeps["generate"],
    capacity: (additionalBytes) => admin.getPhotoStorageCapacity({ data: { additionalBytes } }),
    client: supabase,
  };
}

export type EventPhotoUpload = {
  file: File;
  alt: string;
  eventId: string;
  eventSlug: string;
  slot: string;
  displayOrder: number;
  published?: boolean;
};

/**
 * Envoie une photo dans une galerie d'événement : réencodage dans le navigateur (AVIF + WebP, 4
 * tailles, aucun original envoyé), puis `photos`, `photo_variants` et un emplacement `event`. Les
 * chemins respectent la convention des politiques Storage (`galleries/evenement/<hex>/…`). Si une
 * étape échoue, tout ce que cet essai a créé est supprimé (ce n'est pas une transaction SQL).
 */
export async function uploadEventPhoto(
  input: EventPhotoUpload,
  deps?: EventUploadDeps,
): Promise<{ photoId: string; warning: string | null }> {
  const d = deps ?? (await realDeps());
  const alt = input.alt.trim();
  if (!alt) throw new AdminValidationError("Décrivez la photo (texte alternatif).");
  try {
    await d.validate(input.file);
  } catch (error) {
    throw new AdminValidationError(
      error instanceof Error ? error.message : "Choisissez une photo JPG, HEIC ou PNG.",
    );
  }

  const sourceKey = `galleries/evenement/${crypto.randomUUID().replaceAll("-", "")}`;
  let generated: Variant[];
  try {
    generated = await d.generate(input.file, sourceKey);
  } catch (error) {
    console.error("Préparation locale de la photo impossible", error);
    throw new AdminValidationError(
      error instanceof Error
        ? error.message
        : "Cet appareil ne peut pas préparer cette image. Essayez un JPG.",
    );
  }

  const capacity = await d.capacity(generated.reduce((sum, v) => sum + v.byte_size, 0));
  if (!capacity.canUpload) {
    throw new AdminValidationError(
      "L'espace photo configuré serait dépassé. Supprimez d'anciennes photos ou nettoyez les variantes inutilisées.",
    );
  }
  const warning =
    capacity.projectedPercent !== null && capacity.projectedPercent >= 85
      ? `Après cet envoi, le stockage photo atteindrait ${capacity.projectedPercent.toFixed(1)} % de sa limite.`
      : null;

  const uploaded: string[] = [];
  let photoId: string | undefined;
  try {
    for (const variant of generated) {
      const { error } = await d.client.storage
        .from("photos")
        .upload(variant.storage_path, variant.blob, {
          contentType: `image/${variant.format}`,
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) throw error;
      uploaded.push(variant.storage_path);
    }
    const webp = largestVariant(generated, "webp");
    if (!webp) throw new Error("Variante WebP absente.");
    const imageUrl = d.client.storage.from("photos").getPublicUrl(webp.storage_path).data.publicUrl;

    const { data: photo, error: photoError } = await d.client
      .from("photos")
      .insert({
        image_url: imageUrl,
        alt_text: alt,
        // Jamais de catégorie : les affichages hérités (CategoryGallery, CategoryGallerySection) lisent
        // `photos` par `category_id` + `published`. Sans catégorie, la photo n'apparaît que par son
        // emplacement `event` (galerie de l'événement, visible selon le statut de l'événement).
        category_id: null,
        published: true,
        on_home: false,
        on_portfolio: false,
        source_key: sourceKey,
      })
      .select("id")
      .single();
    if (photoError) throw photoError;
    if (!photo) throw new Error("La photo n'a pas été créée.");
    photoId = photo.id;

    const { error: variantsError } = await d.client.from("photo_variants").insert(
      generated.map((v) => ({
        photo_id: photo.id,
        storage_path: v.storage_path,
        format: v.format,
        width: v.width,
        height: v.height,
        byte_size: v.byte_size,
        sha256: v.sha256,
      })) as never,
    );
    if (variantsError) throw variantsError;

    const { error: placementError } = await d.client.from("photo_placements").insert({
      placement_key: `events/${input.eventSlug}/${input.slot}/${crypto.randomUUID().replaceAll("-", "")}`,
      photo_id: photo.id,
      context_type: "event",
      event_id: input.eventId,
      slot: input.slot,
      display_order: input.displayOrder,
      object_position_x_pct: 50,
      object_position_y_pct: 50,
      published: input.published ?? true,
    });
    if (placementError) throw placementError;
    return { photoId: photo.id, warning };
  } catch (error) {
    if (photoId) {
      for (const op of [
        d.client.from("photo_placements").delete().eq("photo_id", photoId),
        d.client.from("photo_variants").delete().eq("photo_id", photoId),
        d.client.from("photos").delete().eq("id", photoId),
      ]) {
        try {
          await op;
        } catch (cleanup) {
          console.error("Nettoyage incomplet après échec d'envoi", cleanup);
        }
      }
    }
    if (uploaded.length) {
      try {
        await d.client.storage.from("photos").remove(uploaded);
      } catch (cleanup) {
        console.error("Nettoyage Storage incomplet après échec d'envoi", cleanup);
      }
    }
    throw error;
  }
}
