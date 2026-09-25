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
