import noelHeroA from "@/assets/noel-2026/noel-hero-a.webp";
import noelHeroA1600 from "@/assets/noel-2026/noel-hero-a-1600.webp";
import noelHeroA2400 from "@/assets/noel-2026/noel-hero-a-2400.webp";
import noelHeroB from "@/assets/noel-2026/noel-hero-b.webp";
import noelHeroB1600 from "@/assets/noel-2026/noel-hero-b-1600.webp";
import noelHeroB2400 from "@/assets/noel-2026/noel-hero-b-2400.webp";

// Intro, small accent and closing photos: three of the session photos (same files as the gallery).
import introPhoto from "@/assets/noel-2026/noel-s03-07.webp";
import introPhotoLg from "@/assets/noel-2026/noel-s03-07-1600.webp";
import accentPhoto from "@/assets/noel-2026/noel-decor-15.webp";
import accentPhotoLg from "@/assets/noel-2026/noel-decor-15-1600.webp";
import closingPhoto from "@/assets/noel-2026/noel-decor-19.webp";
import closingPhotoLg from "@/assets/noel-2026/noel-decor-19-1600.webp";

// Shared with the homepage teaser — defined once here so both
// consumers stay in sync instead of duplicating hex codes.
export const NOEL_2026_COLORS = {
  burgundy: "#5E1112",
} as const;

export const NOEL_2026_LOCATION = "Plan-d'Aups-Sainte-Baume";

export const NOEL_2026_SESSION_DATES = [
  { iso: "2026-11-07", label: "Samedi 7 novembre 2026" },
  { iso: "2026-11-11", label: "Mercredi 11 novembre 2026" },
] as const;

export const NOEL_2026_WEATHER_FALLBACK_DATES = [
  { iso: "2026-11-14", label: "samedi 14 novembre" },
  { iso: "2026-11-15", label: "dimanche 15 novembre" },
] as const;

// Explicit Europe/Paris offset (CET, +01:00 — no DST ambiguity in
// November) so the loader's server-side comparison never depends on
// the server's local timezone or an implicit UTC read.
export const NOEL_2026_EDITION_ENDS_AT = "2026-11-16T00:00:00+01:00";

export function isNoel2026EditionOver(now: Date): boolean {
  return now.getTime() >= new Date(NOEL_2026_EDITION_ENDS_AT).getTime();
}

export const NOEL_2026_PELLI_URL_DOUCEUR =
  "https://soleana-studio.pelli.io/booking/douceur-de-noel-mini-seance-photo-exterieure";
export const NOEL_2026_PELLI_URL_MAGIE =
  "https://soleana-studio.pelli.io/booking/magie-de-noel-mini-seance-photo-exterieure";

export type NoelFormule = {
  id: string;
  name: string;
  priceEur: number;
  features: string[];
  pelliUrl: string;
};

export const NOEL_2026_FORMULES: NoelFormule[] = [
  {
    id: "douceur",
    name: "Douceur de Noël",
    priceEur: 110,
    features: [
      "25 à 30 minutes de séance",
      "Galerie privée en ligne",
      "5 photos numériques HD à choisir sur votre galerie en ligne",
    ],
    pelliUrl: NOEL_2026_PELLI_URL_DOUCEUR,
  },
  {
    id: "magie",
    name: "Magie de Noël",
    priceEur: 250,
    features: [
      "25 à 30 minutes de séance",
      "Galerie privée en ligne",
      "L'ensemble des images finalisées de la galerie en numérique HD (30 photos minimum)",
      "Un grand tirage fine art 20 × 30 cm d'une photo au choix parmi la galerie finale (valeur 35 €, papier français, impression en France)",
    ],
    pelliUrl: NOEL_2026_PELLI_URL_MAGIE,
  },
];

export type NoelFaqItem = { question: string; answer: string };

export const NOEL_2026_FAQ: NoelFaqItem[] = [
  {
    question: "Combien de temps dure la séance ?",
    answer:
      "Entre 25 et 30 minutes — juste ce qu'il faut pour installer une vraie complicité et repartir avec des images sincères.",
  },
  {
    question: "La séance a-t-elle lieu en intérieur ou en extérieur ?",
    answer:
      "En extérieur, au cœur des sapins. La lumière, l'ambiance et les couleurs peuvent donc varier légèrement selon l'heure de votre créneau.",
  },
  {
    question: "Pourquoi si peu de créneaux ?",
    answer:
      "Deux journées seulement : les places sont limitées. Pour privilégier le temps passé avec chaque famille et chaque couple, sans se presser, et laisser la place à la vraie connexion.",
  },
  {
    question: "Et s'il pleut ?",
    answer:
      "En cas de météo trop capricieuse (pluie, vent fort), les créneaux sont reportés au week-end suivant, à la même heure : le 7 novembre devient le 14, le 11 novembre devient le 15. Merci de vous assurer d'être disponible ce jour-là. En cas d'annulation de votre côté, l'acompte versé ne pourra pas être remboursé.",
  },
  {
    question: "Comment s'habiller ?",
    answer:
      "Pour un résultat harmonieux, un petit guide des tenues vous sera envoyé, quelle que soit votre formule.",
  },
  {
    question: "Comment réserver ma date ?",
    answer:
      "Un acompte de 30 % permet de bloquer votre créneau. Sans acompte versé, la date n'est pas garantie.",
  },
];

export const NOEL_2026_TEXTS = {
  heroTitle: "Mini-séances de Noël 2026",
  heroSubtitle: "Une parenthèse magique pour créer de précieux souvenirs en famille",
  heroDatesLabel: "Samedi 7 et mercredi 11 novembre",
  heroCta: "Réserver ma séance",
  experience: [
    "Le temps d'une mini-séance, on quitte le quotidien pour une parenthèse de Noël en pleine nature, au milieu des sapins. Un décor de fête, une musique d'ambiance, quelques petites douceurs : tout est pensé pour rire, jouer, se retrouver, et repartir avec de vrais souvenirs de cette saison, sincères et lumineux.",
    "Pour les couples, les futurs parents, les familles et les enfants.",
    "À moins d'une heure de Marseille et de Toulon, à Plan d'Aups Sainte-Baume : dépaysement garanti, le temps d'une escapade.",
  ],
  galleryMention:
    "Souvenirs des Noëls passés. Cette année, sous les sapins, un nouveau décor attend en secret.",
  ctaFinalTitle: "Envie de vivre votre propre parenthèse de Noël ?",
  ctaFinalButton: "Réserver ma séance",
  editionOverTitle: "Mini-séances de Noël 2026 — l'édition est terminée",
  editionOverText:
    "L'édition 2026 des mini-séances de Noël est terminée. Merci à toutes les familles, couples et futurs parents qui l'ont vécue avec moi : à très vite pour la prochaine édition.",
  editionOverButton: "Découvrir mes prestations",
} as const;

export type NoelHeroCandidate = {
  id: "a" | "b";
  src: string;
  src1600: string;
  src2400: string;
  objectPosition: string;
  alt: string;
};

export const NOEL_2026_HERO_CANDIDATES: Record<"a" | "b", NoelHeroCandidate> = {
  a: {
    id: "a",
    src: noelHeroA,
    src1600: noelHeroA1600,
    src2400: noelHeroA2400,
    objectPosition: "50% 20%",
    alt: "Couple enlacé lors d'une mini-séance de Noël en extérieur, lumière dorée de fin de journée",
  },
  b: {
    id: "b",
    src: noelHeroB,
    src1600: noelHeroB1600,
    src2400: noelHeroB2400,
    objectPosition: "50% 50%",
    alt: "Couple lors d'une mini-séance de Noël, instant complice en pleine lumière dorée",
  },
};

// Photographer's pick pending — candidate A for now; keep both candidates available.
export const NOEL_2026_ACTIVE_HERO: NoelHeroCandidate = NOEL_2026_HERO_CANDIDATES.a;

export type NoelGalleryPhoto = {
  id: string;
  src: string;
  srcLarge: string;
  width: number;
  height: number;
  alt: string;
};

// Photos used outside the gallery: [0] intro portrait, [1] small accent, [2] closing.
export const NOEL_2026_GALLERY_PHOTOS: NoelGalleryPhoto[] = [
  {
    id: "noel-gallery-01",
    src: introPhoto,
    srcLarge: introPhotoLg,
    width: 700,
    height: 1050,
    alt: "Couple lors d'une mini-séance de Noël en extérieur, ambiance chaleureuse au milieu de la nature",
  },
  {
    id: "noel-gallery-06",
    src: accentPhoto,
    srcLarge: accentPhotoLg,
    width: 700,
    height: 1050,
    alt: "Étoile lumineuse suspendue sous les sapins, décor de Noël en pleine nature",
  },
  {
    id: "noel-gallery-07",
    src: closingPhoto,
    srcLarge: closingPhotoLg,
    width: 700,
    height: 1050,
    alt: "Étoile de Noël suspendue sous le ciel du soir, traîneau et guirlandes lumineuses",
  },
];

export const NOEL_2026_SEO = {
  title: "Mini-séances de Noël 2026 près de Marseille | Soleana Studio",
  description:
    "Mini-séances photo de Noël en extérieur les 7 et 11 novembre 2026, à Plan-d'Aups-Sainte-Baume. Deux formules, places limitées. Réservez votre créneau.",
  path: "/mini-seances-noel-2026",
  ogTitle: "Mini-séances de Noël 2026 — Soleana Studio",
  ogDescription:
    "Une parenthèse de Noël en famille, au cœur de la Sainte-Baume. 7 & 11 novembre 2026, places limitées.",
} as const;

export const NOEL_2026_PAGE_COPY = {
  editionStatus: "Édition terminée",
  experienceTitle: "Le déroulement de la séance",
  experienceItems: [
    NOEL_2026_FORMULES[0].features[0],
    "En extérieur, à " + NOEL_2026_LOCATION,
    "Une ambiance de Noël avec décor, musique d'ambiance et petites douceurs",
    "Pour les couples, futurs parents, familles et enfants",
  ],
  formulesTitle: "Les formules",
  formulesIntro: "Réservation via les liens dédiés — un lien par formule.",
  formuleCta: "Réserver cette formule",
  datesTitle: "Les dates",
  limitedPlaces: "Deux journées seulement : les places sont limitées.",
  faqTitle: "Questions fréquentes",
  galleryTitle: "Photos des mini-séances de Noël",
} as const;

export const NOEL_2026_TEASER = {
  label: "Édition limitée",
  title: NOEL_2026_TEXTS.heroTitle,
  datesLabel:
    NOEL_2026_SESSION_DATES.map((date) => Number(date.iso.split("-")[2])).join(" & ") +
    " novembre " +
    NOEL_2026_SESSION_DATES[0].iso.slice(0, 4),
  text: "Une parenthèse de Noël en pleine nature, au milieu des sapins — deux journées seulement, places limitées.",
  cta: "Découvrir les mini-séances",
  photo: NOEL_2026_HERO_CANDIDATES[NOEL_2026_ACTIVE_HERO.id === "a" ? "b" : "a"],
} as const;

export const NOEL_2026_CAMPAIGN = {
  editionLabel: "Édition Noël 2026",
  detailPhoto: NOEL_2026_GALLERY_PHOTOS[1],
  closingPhoto: NOEL_2026_GALLERY_PHOTOS[2],
} as const;
