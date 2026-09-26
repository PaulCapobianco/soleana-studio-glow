import {
  NOEL_2026_ACTIVE_HERO,
  NOEL_2026_FORMULES,
  NOEL_2026_LOCATION,
  NOEL_2026_SEO,
  NOEL_2026_SESSION_DATES,
  NOEL_2026_TEXTS,
} from "@/data/noel-2026";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// One Event per session day (7 and 11 November are not a continuous event). No start
// time is published, so dates stay date-only. Everything comes from the data file.
export function buildNoel2026EventJsonLd() {
  const pageUrl = absoluteUrl(NOEL_2026_SEO.path);

  return {
    "@context": "https://schema.org",
    "@graph": NOEL_2026_SESSION_DATES.map((session) => ({
      "@type": "Event",
      name: NOEL_2026_TEXTS.heroTitle,
      description: NOEL_2026_SEO.description,
      startDate: session.iso,
      endDate: session.iso,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: NOEL_2026_LOCATION,
        address: {
          "@type": "PostalAddress",
          addressLocality: NOEL_2026_LOCATION,
          addressCountry: "FR",
        },
      },
      organizer: { "@type": "Organization", name: "Soleana Studio", url: SITE_URL },
      image: [absoluteUrl(NOEL_2026_ACTIVE_HERO.src1600)],
      url: pageUrl,
      offers: NOEL_2026_FORMULES.map((formule) => ({
        "@type": "Offer",
        name: formule.name,
        price: formule.priceEur,
        priceCurrency: "EUR",
        url: pageUrl,
      })),
    })),
  };
}
