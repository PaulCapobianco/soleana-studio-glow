import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const SITE_URL = "https://soleanastudio.fr";

const PATHS = [
  "/",
  "/portfolio",
  // /portfolio/grossesse, /famille, /couple and /portrait are left out on purpose: they
  // render the generic portfolio until BUG-02 is fixed. Put them back with the fix (0a23b0f).
  "/prestations",
  "/mini-seances-noel-2026",
  "/reservation",
  "/a-propos",
  "/faq",
  "/contact",
  "/mentions-legales",
  "/confidentialite",
  "/photographe-grossesse-marseille",
  "/photographe-famille-marseille",
  "/photographe-couple-marseille",
  "/photographe-portrait-marseille",
  "/photographe-lifestyle-marseille",
  "/photographe-bapteme-marseille",
  "/photographe-mariage-marseille",
  "/photographe-anniversaire-marseille",
] as const;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const lastmod = new Date().toISOString().split("T")[0];
        const urls = PATHS.map((path) => {
          const priority = path === "/" ? "1.0" : path.startsWith("/photographe") ? "0.8" : "0.7";

          return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
        }).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
