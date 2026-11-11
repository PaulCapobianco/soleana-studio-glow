// Contrôles « à la publication » pour la photographe : avertissements qui ne bloquent pas, et
// détection d'un changement de dates sur un événement déjà publié. Fonctions pures, testées.

import { formatHeroDates, isEditionOver } from "./dates";
import type { EventFormValues } from "./validation";

export const PELLI_HOST = "soleana-studio.pelli.io";

/** Lien de réservation Pelli : https, hôte `soleana-studio.pelli.io` (ou un sous-domaine de pelli.io). */
export function isPelliUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (host === PELLI_HOST || host.endsWith(".pelli.io"))
    );
  } catch {
    return false;
  }
}

export type GalleryStats = {
  /** Nombre de galeries définies dans la fiche. */
  galleries: number;
  /** Galeries qui n'ont aucune photo (publiée ou non). */
  emptyGalleries: string[];
  /** Photos sans texte alternatif. */
  photosWithoutAlt: number;
  /** Photos masquées (non publiées) dans les galeries. */
  hiddenPhotos: number;
};

export type PublishWarningContext = {
  /** Image de couverture envoyée (ou fournie avec le site pour les éditions historiques). */
  hasCover: boolean;
  /** null tant que les galeries ne sont pas disponibles (migration non appliquée). */
  galleryStats: GalleryStats | null;
  now: Date;
};

/**
 * Avertissements affichés avant de publier ; la photographe peut publier malgré eux. Les erreurs
 * qui empêchent la publication restent dans validateEventForPublish.
 */
export function publishWarnings(values: EventFormValues, context: PublishWarningContext): string[] {
  const warnings: string[] = [];
  if (!context.hasCover) {
    warnings.push(
      "Aucune image de couverture : la page, l'accueil et les partages (Facebook, WhatsApp…) s'afficheront sans grande photo. Ajoutez-en une dans « Image de couverture ».",
    );
  }
  if (
    values.event_dates.length > 0 &&
    isEditionOver(values.event_dates, values.fallback_dates, context.now)
  ) {
    warnings.push(
      "Toutes les dates sont passées : la page affichera « édition terminée ». Vérifiez les dates si ce n'est pas voulu.",
    );
  }
  if (!values.location.trim()) {
    warnings.push(
      "Le lieu n'est pas indiqué : les visiteurs et Google ne sauront pas où cela se passe.",
    );
  }
  const stats = context.galleryStats;
  if (stats) {
    if (stats.emptyGalleries.length > 0) {
      warnings.push(
        `${stats.emptyGalleries.length === 1 ? "La galerie" : "Les galeries"} « ${stats.emptyGalleries.join(" », « ")} » ${stats.emptyGalleries.length === 1 ? "est vide" : "sont vides"} : ${stats.emptyGalleries.length === 1 ? "elle" : "elles"} n'${stats.emptyGalleries.length === 1 ? "apparaîtra" : "apparaîtront"} pas sur la page tant qu'il n'y a pas de photo.`,
      );
    }
    if (stats.photosWithoutAlt > 0) {
      warnings.push(
        `${stats.photosWithoutAlt} photo${stats.photosWithoutAlt > 1 ? "s n'ont" : " n'a"} pas de description : elle${stats.photosWithoutAlt > 1 ? "s sont" : " est"} moins bien référencée${stats.photosWithoutAlt > 1 ? "s" : ""} et illisible${stats.photosWithoutAlt > 1 ? "s" : ""} pour les personnes malvoyantes.`,
      );
    }
  }
  return warnings;
}

export type DatesChange = {
  changed: boolean;
  added: string[];
  removed: string[];
  fallbackChanged: boolean;
};

const sorted = (dates: readonly string[]) => [...dates].sort();

/** Compare les dates d'avant et d'après modification (séances et dates de report). */
export function datesChange(before: EventFormValues, after: EventFormValues): DatesChange {
  const b = sorted(before.event_dates);
  const a = sorted(after.event_dates);
  const added = a.filter((d) => !b.includes(d));
  const removed = b.filter((d) => !a.includes(d));
  const fallbackChanged =
    sorted(before.fallback_dates).join() !== sorted(after.fallback_dates).join();
  return {
    changed: added.length > 0 || removed.length > 0 || fallbackChanged,
    added,
    removed,
    fallbackChanged,
  };
}

/** Texte de confirmation quand on change les dates d'un événement DÉJÀ publié ; null si rien à confirmer. */
export function datesChangeConfirmation(
  before: EventFormValues,
  after: EventFormValues,
): string | null {
  const change = datesChange(before, after);
  if (!change.changed) return null;
  const heading = after.event_dates.length > 0 ? formatHeroDates(after.event_dates) : "aucune date";
  return `Vous changez les dates d'un événement déjà publié. Dès l'enregistrement, la page, l'accueil et Google afficheront : ${heading}. Enregistrer ?`;
}
