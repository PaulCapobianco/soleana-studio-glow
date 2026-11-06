import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;

export type EventStatus = "draft" | "published" | "archived";

export type EventFormule = {
  name: string;
  price_eur: number;
  /** Une ligne = une puce affichée sur la carte de la formule. */
  features: string[];
  booking_url: string;
  featured: boolean;
};

export type EventFaqItem = { question: string; answer: string };

/** Une ligne `events` dont les colonnes JSON ont été validées. */
export type EventContent = Omit<EventRow, "formules" | "faq" | "status"> & {
  status: EventStatus;
  formules: EventFormule[];
  faq: EventFaqItem[];
};

/** Ce que la page publique reçoit : le contenu + l'état « édition terminée » calculé côté serveur. */
export type PublicEventPage = { event: EventContent; isOver: boolean };

/** Ce que le teaser d'accueil reçoit. */
export type EventTeaserData = {
  slug: string;
  editionLabel: string;
  title: string;
  datesLabel: string;
  location: string;
  text: string;
  cta: string;
  imageUrl: string | null;
  imageSmallUrl: string | null;
  imageAlt: string;
};
