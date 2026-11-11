import defaultSocialImage from "@/assets/accueil/hero_1.webp";

export const SITE_URL = "https://soleanastudio.fr";

export const DEFAULT_SOCIAL_IMAGE = defaultSocialImage;

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
};

export const absoluteUrl = (path = "/") => new URL(path, SITE_URL).toString();

export const buildPageSeo = ({
  title,
  description,
  path,
  ogTitle,
  ogDescription,
  noIndex = false,
}: SeoOptions) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: ogTitle?.trim() || title },
    { property: "og:description", content: ogDescription?.trim() || description },
    { property: "og:url", content: absoluteUrl(path) },
    ...(noIndex ? [{ name: "robots", content: "noindex,nofollow" }] : []),
  ],
  links: noIndex ? [] : [{ rel: "canonical", href: absoluteUrl(path) }],
});

/**
 * JSON destiné à un `<script type="application/ld+json">`. TanStack Router insère le contenu tel
 * quel dans la page : un texte venant de la base contenant `</script>` fermerait la balise et
 * laisserait du HTML s'exécuter. On échappe `<`, `>`, `&` et les séparateurs U+2028/2029 ; le JSON
 * reste valide et identique une fois lu par un moteur de recherche.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
