import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { formatTeaserDates } from "./dates";
import type { EventContent, EventTeaserData } from "./types";

export const eventPath = (slug: string) => `/${slug}`;

/** Titre / description du `<head>` : champs SEO s'ils sont remplis, sinon déduits du contenu. */
export function eventSeo(event: EventContent) {
  const title = event.meta_title.trim() || `${event.title} | Soleana Studio`;
  const description =
    event.meta_description.trim() ||
    event.subtitle.trim() ||
    event.description
      .trim()
      .split(/\n\s*\n/)[0]
      ?.slice(0, 300) ||
    event.title;
  return {
    title,
    description,
    path: eventPath(event.slug),
    ogTitle: event.og_title.trim() || undefined,
    ogDescription: event.og_description.trim() || undefined,
  };
}

/** Image de partage (Open Graph) : la couverture de l'événement, sinon celle fournie par le site. */
export function eventOgImage(event: EventContent, fallbackUrl: string | null): string | null {
  const url = event.cover_image_url ?? fallbackUrl;
  return url ? absoluteUrl(url) : null;
}

/**
 * Données structurées `Event` : une par jour de séance (les jours ne sont pas un événement
 * continu). Aucune heure n'est publiée, les dates restent donc des jours entiers.
 */
export function buildEventJsonLd(event: EventContent, imageUrl: string | null) {
  const pageUrl = absoluteUrl(eventPath(event.slug));
  const seo = eventSeo(event);
  const place = event.location.trim();

  return {
    "@context": "https://schema.org",
    "@graph": [...event.event_dates].sort().map((date) => ({
      "@type": "Event",
      name: event.title,
      description: seo.description,
      startDate: date,
      endDate: date,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(place
        ? {
            location: {
              "@type": "Place",
              name: place,
              address: { "@type": "PostalAddress", addressLocality: place, addressCountry: "FR" },
            },
          }
        : {}),
      organizer: { "@type": "Organization", name: "Soleana Studio", url: SITE_URL },
      ...(imageUrl ? { image: [absoluteUrl(imageUrl)] } : {}),
      url: pageUrl,
      ...(event.formules.length > 0
        ? {
            offers: event.formules.map((formule) => ({
              "@type": "Offer",
              name: formule.name,
              price: formule.price_eur,
              priceCurrency: "EUR",
              url: pageUrl,
            })),
          }
        : {}),
    })),
  };
}

export function buildTeaser(event: EventContent): EventTeaserData {
  return {
    slug: event.slug,
    editionLabel: event.edition_label.trim() || "Soleana Studio",
    title: event.teaser_title.trim() || event.title,
    datesLabel: formatTeaserDates(event.event_dates),
    location: event.location.trim(),
    text: event.teaser_text.trim() || event.subtitle.trim(),
    cta: event.teaser_cta.trim() || "Découvrir",
    imageUrl: event.cover_image_url,
    imageSmallUrl: event.cover_image_small_url,
    imageAlt: event.cover_image_alt,
  };
}
