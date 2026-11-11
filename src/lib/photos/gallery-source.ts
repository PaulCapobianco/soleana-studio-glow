// Quelle source alimente la galerie d'une page catégorie : Storage (placements publiés) ou, en
// repli, l'ancienne table `photos` filtrée par catégorie. Fonction pure, testée : elle évite de
// lancer les requêtes de repli (catégorie + photos) tant que la lecture Storage n'a pas répondu, et
// pour de bon quand Storage a des photos.

export type StorageReading = {
  /** true tant que la lecture Storage n'a pas abouti (ou échoué). */
  pending: boolean;
  /** Photos lues, null si la lecture a échoué ou la catégorie est inconnue. */
  photos: readonly unknown[] | null | undefined;
};

/** Vrai quand les photos de l'ancienne table `photos` peuvent être affichées (donc lues). */
export function needsLegacyPhotos(storageEnabled: boolean, storage: StorageReading): boolean {
  if (!storageEnabled) return true;
  if (storage.pending) return false;
  return !storage.photos?.length;
}
