import { isIsoDate } from "./dates";

export type EventFormuleForm = {
  name: string;
  price_eur: number | null;
  features: string[];
  booking_url: string;
  featured: boolean;
};

/** Valeurs du formulaire admin (les listes de dates ne contiennent que des champs déjà remplis). */
export type EventFormValues = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  location: string;
  edition_label: string;
  experience_steps: string[];
  closing_title: string;
  event_dates: string[];
  fallback_dates: string[];
  availability_note: string;
  formules: EventFormuleForm[];
  faq: { question: string; answer: string }[];
  booking_url: string;
  cover_image_alt: string;
  ended_title: string;
  ended_text: string;
  show_teaser: boolean;
  teaser_title: string;
  teaser_text: string;
  teaser_cta: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  display_order: number;
};

/** Clé = champ (`title`, `event_dates`…) ou champ d'une liste (`formules.0.booking_url`). */
export type EventErrors = Record<string, string>;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lien de réservation : https obligatoire, pas d'identifiants dans l'adresse, un vrai nom de domaine. */
export function isValidBookingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/** « Le Noël de Léa 2027 ! » → « le-noel-de-lea-2027 » */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

function dateErrors(
  field: "event_dates" | "fallback_dates",
  dates: string[],
  errors: EventErrors,
): void {
  if (dates.some((d) => !isIsoDate(d))) {
    errors[field] = "Une des dates n'est pas valide.";
  } else if (new Set(dates).size !== dates.length) {
    errors[field] = "La même date est indiquée deux fois.";
  }
}

/**
 * Contrôles à l'enregistrement (un brouillon peut rester incomplet) : on refuse seulement ce qui
 * est faux, pas ce qui manque encore.
 */
export function validateEventDraft(values: EventFormValues): EventErrors {
  const errors: EventErrors = {};

  if (!values.title.trim()) errors.title = "Le titre est obligatoire.";
  else if (values.title.trim().length > 120) errors.title = "Le titre est trop long (120 maximum).";

  if (!values.slug) errors.slug = "L'adresse de la page est obligatoire.";
  else if (!SLUG_PATTERN.test(values.slug)) {
    errors.slug = "Utilisez uniquement des minuscules, des chiffres et des tirets (ex. noel-2027).";
  }

  dateErrors("event_dates", values.event_dates, errors);
  dateErrors("fallback_dates", values.fallback_dates, errors);

  if (!errors.event_dates && !errors.fallback_dates && values.fallback_dates.length > 0) {
    const overlap = values.fallback_dates.find((d) => values.event_dates.includes(d));
    const firstMain = [...values.event_dates].sort()[0];
    if (overlap) {
      errors.fallback_dates = "Une date de report est aussi une date de séance.";
    } else if (firstMain && values.fallback_dates.some((d) => d < firstMain)) {
      errors.fallback_dates = "Les dates de report doivent venir après la première date de séance.";
    }
  }

  values.formules.forEach((formule, index) => {
    if (!formule.name.trim()) errors[`formules.${index}.name`] = "Donnez un nom à la formule.";
    if (
      formule.price_eur === null ||
      !Number.isInteger(formule.price_eur) ||
      formule.price_eur < 0
    ) {
      errors[`formules.${index}.price_eur`] = "Indiquez un prix en euros (nombre entier).";
    }
    if (formule.booking_url.trim() && !isValidBookingUrl(formule.booking_url.trim())) {
      errors[`formules.${index}.booking_url`] =
        "Ce lien n'est pas valide : il doit commencer par https:// (copiez-le depuis Pelli).";
    }
  });

  if (values.booking_url.trim() && !isValidBookingUrl(values.booking_url.trim())) {
    errors.booking_url =
      "Ce lien n'est pas valide : il doit commencer par https:// (copiez-le depuis Pelli).";
  }

  values.faq.forEach((item, index) => {
    if (!item.question.trim() || !item.answer.trim()) {
      errors[`faq.${index}`] = "Renseignez la question et sa réponse, ou supprimez-la.";
    }
  });

  if (!Number.isInteger(values.display_order) || values.display_order < 0) {
    errors.display_order = "L'ordre doit être un nombre entier positif ou zéro.";
  }

  return errors;
}

/** Contrôles supplémentaires avant publication : la page doit pouvoir être réservée. */
export function validateEventForPublish(values: EventFormValues): EventErrors {
  const errors = validateEventDraft(values);

  if (values.event_dates.length === 0) {
    errors.event_dates = "Ajoutez au moins une date avant de publier.";
  }
  if (!values.description.trim()) errors.description = "Ajoutez une présentation avant de publier.";

  if (values.formules.length > 0) {
    values.formules.forEach((formule, index) => {
      if (!formule.booking_url.trim()) {
        errors[`formules.${index}.booking_url`] =
          "Ajoutez le lien de réservation de cette formule.";
      }
    });
  } else if (!values.booking_url.trim()) {
    errors.booking_url = "Ajoutez un lien de réservation, ou au moins une formule avec son lien.";
  }

  if (values.show_teaser && !values.teaser_text.trim()) {
    errors.teaser_text =
      "Écrivez un petit texte pour l'accueil, ou décochez « Afficher sur l'accueil ».";
  }

  return errors;
}
