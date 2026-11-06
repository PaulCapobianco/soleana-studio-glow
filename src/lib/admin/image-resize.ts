// Redimensionne une photo dans le navigateur et la convertit en WebP avant l'envoi : la
// photographe peut choisir une photo d'appareil de plusieurs Mo, seule une version légère part sur
// le site. Le réencodage par canvas ne recopie aucune métadonnée (EXIF, GPS…) ; l'orientation est
// appliquée avant le dessin pour que la photo ne soit jamais pivotée.

export type ResizedImage = { width: number; height: number; blob: Blob };

export const MAX_COVER_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Largeur cible → largeur réelle (jamais d'agrandissement au-delà de l'original). */
export function targetWidth(sourceWidth: number, wanted: number): number {
  return Math.min(sourceWidth, wanted);
}

export async function resizeToWebp(
  file: File,
  widths: readonly number[],
  quality = 0.82,
): Promise<ResizedImage[]> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const results: ResizedImage[] = [];
    for (const wanted of widths) {
      const width = targetWidth(bitmap.width, wanted);
      const height = Math.round((bitmap.height * width) / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas indisponible");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (!blob) throw new Error("conversion WebP impossible");
      results.push({ width, height, blob });
    }
    return results;
  } finally {
    bitmap.close();
  }
}
