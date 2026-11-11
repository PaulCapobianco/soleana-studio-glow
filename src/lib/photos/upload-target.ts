import { AdminValidationError } from "@/lib/admin/friendly-error";
import { nextPlacementOrder } from "@/lib/events/gallery-admin";
import { parseGalleryDefs, type EventGalleryDef } from "@/lib/events/galleries";

/** Cible d'un envoi depuis l'admin Photos : une page du site ou la galerie d'un événement. */
export type UploadTargetKind = "seo" | "event";

export type EventTargetOption = { id: string; slug: string; title: string; galleries: unknown };
export type EventPlacementLite = { event_id: string; slot: string; display_order: number };

/** Galeries proposées pour un événement (vide si l'événement n'en a pas encore créé). */
export function eventGalleryChoices(
  events: readonly EventTargetOption[],
  eventId: string,
): EventGalleryDef[] {
  const event = events.find((item) => item.id === eventId);
  return event ? parseGalleryDefs(event.galleries) : [];
}

export type EventUploadPlan = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  slot: string;
  galleryTitle: string;
  displayOrder: number;
};

/**
 * Valide la cible « événement » et calcule l'ordre d'affichage (prochain numéro si vide). Lève une
 * AdminValidationError dont le message est destiné à la photographe.
 */
export function planEventUpload(input: {
  events: readonly EventTargetOption[];
  placements: readonly EventPlacementLite[];
  eventId: string;
  slot: string;
  orderInput: string;
}): EventUploadPlan {
  const event = input.events.find((item) => item.id === input.eventId);
  if (!event) throw new AdminValidationError("Choisissez un événement.");
  const gallery = parseGalleryDefs(event.galleries).find((item) => item.slot === input.slot);
  if (!gallery) {
    throw new AdminValidationError(
      "Choisissez une galerie de cet événement (créez-la d'abord dans la fiche de l'événement).",
    );
  }
  const inGallery = input.placements
    .filter((item) => item.event_id === event.id && item.slot === gallery.slot)
    .map((item, index) => ({ id: String(index), display_order: item.display_order }));
  const trimmed = input.orderInput.trim();
  const displayOrder = trimmed === "" ? nextPlacementOrder(inGallery) : Number(trimmed);
  if (
    !Number.isSafeInteger(displayOrder) ||
    displayOrder < 0 ||
    inGallery.some((item) => item.display_order === displayOrder)
  ) {
    throw new AdminValidationError("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
  }
  return {
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    slot: gallery.slot,
    galleryTitle: gallery.title,
    displayOrder,
  };
}

/** Texte « Événement · Galerie » pour les cartes de la bibliothèque (une photo peut servir plusieurs fois). */
export function describeEventUsage(
  events: readonly EventTargetOption[],
  placements: readonly EventPlacementLite[],
): string[] {
  const labels = new Set<string>();
  for (const placement of placements) {
    const event = events.find((item) => item.id === placement.event_id);
    if (!event) continue;
    const gallery = parseGalleryDefs(event.galleries).find((item) => item.slot === placement.slot);
    labels.add(`${event.title} · ${gallery?.title ?? placement.slot}`);
  }
  return [...labels];
}
