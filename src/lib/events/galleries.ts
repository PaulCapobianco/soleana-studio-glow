import { z } from "zod";
import type { StorageGalleryPhoto } from "@/lib/photos/gallery-loaders";

// Galeries photo d'un événement. Une galerie = un `slot` (clé des emplacements photo_placements,
// context_type = 'event') + un titre ; l'ordre de la liste est l'ordre d'affichage. La couverture
// d'une galerie est sa première photo (display_order 0).

export type EventGalleryDef = { slot: string; title: string };

export const SLOT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/;

const galleryDefSchema = z.object({
  slot: z.string().regex(SLOT_PATTERN),
  title: z.string().trim().min(1).max(80),
});

/** Colonne JSON `events.galleries` → liste validée (entrées invalides écartées, doublons de slot retirés). */
export function parseGalleryDefs(value: unknown): EventGalleryDef[] {
  const out: EventGalleryDef[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const parsed = galleryDefSchema.safeParse(item);
    if (parsed.success && !out.some((g) => g.slot === parsed.data.slot)) out.push(parsed.data);
  }
  return out;
}

/** Identifiant d'une nouvelle galerie : galerie-1, galerie-2… (jamais réutilisé, même après suppression). */
export function newGallerySlot(existing: readonly EventGalleryDef[]): string {
  const used = new Set(existing.map((g) => g.slot));
  for (let n = existing.length + 1; n < 10000; n += 1) {
    if (!used.has(`galerie-${n}`)) return `galerie-${n}`;
  }
  return `galerie-${Date.now()}`;
}

export function validateGalleryTitle(title: string): string | null {
  const clean = title.trim();
  if (!clean) return "Donnez un nom à la galerie.";
  if (clean.length > 80) return "Ce nom est trop long (80 caractères maximum).";
  return null;
}

/** Une galerie prête à afficher. */
export type PublicEventGallery = {
  slot: string;
  title: string;
  photos: StorageGalleryPhoto[];
};

/** Un bloc d'affichage : les galeries de l'événement, ou celles d'une édition précédente (référence). */
export type EventGalleryGroup = {
  /** « Édition précédente » : titre de l'autre événement ; absent pour les galeries de l'événement. */
  previousEdition: { title: string; slug: string } | null;
  galleries: PublicEventGallery[];
};

/**
 * Galeries à afficher pour une liste de définitions et les photos lues par `slot`. Une galerie sans
 * photo publiée n'est pas affichée. Les photos d'un `slot` qui n'est plus dans la liste sont ignorées.
 */
export function publicGalleries(
  defs: readonly EventGalleryDef[],
  bySlot: Record<string, StorageGalleryPhoto[]> | null,
): PublicEventGallery[] {
  if (!bySlot) return [];
  return defs
    .map((def) => ({ slot: def.slot, title: def.title, photos: bySlot[def.slot] ?? [] }))
    .filter((g) => g.photos.length > 0);
}

/** Assemble les blocs : galeries propres d'abord, puis « Édition précédente » si elle a des photos. */
export function buildGalleryGroups(input: {
  own: PublicEventGallery[];
  previous: { title: string; slug: string; galleries: PublicEventGallery[] } | null;
}): EventGalleryGroup[] {
  const groups: EventGalleryGroup[] = [];
  if (input.own.length > 0) groups.push({ previousEdition: null, galleries: input.own });
  if (input.previous && input.previous.galleries.length > 0) {
    groups.push({
      previousEdition: { title: input.previous.title, slug: input.previous.slug },
      galleries: input.previous.galleries,
    });
  }
  return groups;
}
