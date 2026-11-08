// Données de repli transitoires : la page « Mini-séances de Noël 2026 » telle qu'elle était codée
// en dur. Elles ne servent que si la table `events` n'existe pas encore ou ne répond pas
// (voir queries.ts). Une fois la migration 20261106000000 appliquée et vérifiée en production,
// ce fichier et les textes de src/data/noel-2026.ts peuvent être supprimés (les images, elles,
// restent utilisées : voir src/components/site/event-assets.ts).
import {
  NOEL_2026_FAQ,
  NOEL_2026_FORMULES,
  NOEL_2026_LOCATION,
  NOEL_2026_PAGE_COPY,
  NOEL_2026_SEO,
  NOEL_2026_SESSION_DATES,
  NOEL_2026_TEASER,
  NOEL_2026_TEXTS,
  NOEL_2026_WEATHER_FALLBACK_DATES,
} from "@/data/noel-2026";
import type { EventContent } from "./types";

export const LEGACY_NOEL_SLUG = "mini-seances-noel-2026";

export function legacyNoelEvent(): EventContent {
  const now = new Date(0).toISOString();
  return {
    id: "legacy-noel-2026",
    slug: LEGACY_NOEL_SLUG,
    title: NOEL_2026_TEXTS.heroTitle,
    subtitle: NOEL_2026_TEXTS.heroSubtitle,
    description: NOEL_2026_TEXTS.experience.join("\n\n"),
    location: NOEL_2026_LOCATION,
    edition_label: "Édition Noël 2026",
    experience_steps: [...NOEL_2026_PAGE_COPY.experienceItems],
    closing_title: NOEL_2026_TEXTS.ctaFinalTitle,
    event_dates: NOEL_2026_SESSION_DATES.map((d) => d.iso),
    fallback_dates: NOEL_2026_WEATHER_FALLBACK_DATES.map((d) => d.iso),
    availability_note: NOEL_2026_PAGE_COPY.limitedPlaces,
    formules: NOEL_2026_FORMULES.map((f, index) => ({
      name: f.name,
      price_eur: f.priceEur,
      features: [...f.features],
      booking_url: f.pelliUrl,
      featured: index === 1,
    })),
    faq: NOEL_2026_FAQ.map((item) => ({ ...item })),
    booking_url: null,
    cover_image_url: null,
    cover_image_small_url: null,
    cover_image_alt: "",
    ended_title: NOEL_2026_TEXTS.editionOverTitle,
    ended_text: NOEL_2026_TEXTS.editionOverText,
    show_teaser: true,
    teaser_title: "",
    teaser_text: NOEL_2026_TEASER.text,
    teaser_cta: NOEL_2026_TEASER.cta,
    meta_title: NOEL_2026_SEO.title,
    meta_description: NOEL_2026_SEO.description,
    og_title: NOEL_2026_SEO.ogTitle,
    og_description: NOEL_2026_SEO.ogDescription,
    galleries: [],
    gallery_reference_event_id: null,
    theme: "noel-classique",
    accent_color: null,
    icon_main: "etoile-noel",
    icon_bullet: "defaut",
    status: "published",
    first_published_at: now,
    display_order: 1,
    created_at: now,
    updated_at: now,
  };
}
