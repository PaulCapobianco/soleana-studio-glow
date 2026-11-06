import {
  NOEL_2026_ACTIVE_HERO,
  NOEL_2026_GALLERY_PHOTOS,
  NOEL_2026_TEASER,
  type NoelGalleryPhoto,
  type NoelHeroCandidate,
} from "@/data/noel-2026";
import { LEGACY_NOEL_SLUG } from "@/lib/events/legacy-noel";

// Images d'un événement qui ne viennent pas (encore) de la base : celles de l'édition Noël 2026,
// fournies avec le site. La migration des photos vers Supabase est un chantier à part ; en
// attendant, un événement créé depuis l'admin n'a que son image de couverture.
export type EventAssets = {
  hero: NoelHeroCandidate;
  teaser: NoelHeroCandidate;
  intro: NoelGalleryPhoto;
  accent: NoelGalleryPhoto;
  closing: NoelGalleryPhoto;
  /** Galerie par séance (chargée à part : 74 photos). */
  hasGallery: boolean;
  galleryTitle: string;
  galleryCaption: string;
};

const NOEL_2026_ASSETS: EventAssets = {
  hero: NOEL_2026_ACTIVE_HERO,
  teaser: NOEL_2026_TEASER.photo,
  intro: NOEL_2026_GALLERY_PHOTOS[0],
  accent: NOEL_2026_GALLERY_PHOTOS[1],
  closing: NOEL_2026_GALLERY_PHOTOS[2],
  hasGallery: true,
  galleryTitle: "Photos des mini-séances de Noël",
  galleryCaption:
    "Souvenirs des Noëls passés. Cette année, sous les sapins, un nouveau décor attend en secret.",
};

export function eventAssets(slug: string): EventAssets | null {
  return slug === LEGACY_NOEL_SLUG ? NOEL_2026_ASSETS : null;
}
