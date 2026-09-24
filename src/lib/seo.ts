export const SITE_URL = "https://soleanastudio.fr";

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
    { property: "og:title", content: ogTitle ?? title },
    { property: "og:description", content: ogDescription ?? description },
    { property: "og:url", content: absoluteUrl(path) },
    ...(noIndex ? [{ name: "robots", content: "noindex,nofollow" }] : []),
  ],
  links: noIndex ? [] : [{ rel: "canonical", href: absoluteUrl(path) }],
});
