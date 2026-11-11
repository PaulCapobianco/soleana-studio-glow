/**
 * INTERRUPTEUR UNIQUE de la lecture des galeries depuis Supabase Storage.
 * Désactivé par défaut : le site continue d'afficher les fichiers locaux, à l'identique.
 * À activer (VITE_GALLERIES_FROM_STORAGE=true au build) seulement après application de la migration
 * photo_variants / photo_placements ET import complet des photos.
 */
export const STORAGE_GALLERIES_ENABLED = import.meta.env.VITE_GALLERIES_FROM_STORAGE === "true";
