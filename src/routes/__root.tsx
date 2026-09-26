import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import logoSoleanaIcon from "@/assets/logo-soleana-icon.png";
import inter300 from "@/assets/fonts/Inter-300.woff2";
import playfair600 from "@/assets/fonts/PlayfairDisplay-600.woff2";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent mb-4">404</p>
        <h1 className="font-display text-4xl italic text-foreground">Page introuvable</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-[#C6966F] px-8 py-3 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#b8845f]"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl italic text-foreground">Une erreur est survenue</h1>
        <p className="mt-4 text-sm text-muted-foreground">Merci de réessayer dans un instant.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-[#C6966F] px-6 py-3 text-xs uppercase tracking-widest text-white"
          >
            Réessayer
          </button>
          <a href="/" className="border border-border px-6 py-3 text-xs uppercase tracking-widest">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Soleana Studio — Photographe lifestyle Marseille" },
      {
        name: "description",
        content:
          "Photographe grossesse, famille, couple et portrait à Marseille et alentours. Séances douces, naturelles et lumineuses.",
      },
      { name: "author", content: "Soleana Studio" },
      { property: "og:site_name", content: "Soleana Studio" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: absoluteUrl(DEFAULT_SOCIAL_IMAGE) },
      { property: "og:title", content: "Soleana Studio — Photographe lifestyle Marseille" },
      {
        property: "og:description",
        content: "Photographe grossesse, famille, couple et portrait à Marseille et alentours.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#FAF6EF" },
      ...(matches.some(
        (match) => match.globalNotFound || match.status === "notFound" || match.status === "error",
      )
        ? [{ name: "robots", content: "noindex,nofollow" }]
        : []),
    ],
    links: [
      {
        rel: "preload",
        as: "font",
        href: inter300,
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        href: playfair600,
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: logoSoleanaIcon },
      { rel: "apple-touch-icon", href: logoSoleanaIcon },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "Soleana Studio",
          image: absoluteUrl(DEFAULT_SOCIAL_IMAGE),
          url: absoluteUrl("/"),
          description:
            "Photographe lifestyle à Marseille — séances grossesse, famille, couple et portrait.",
          areaServed: ["Marseille", "Aubagne", "Cassis", "La Ciotat", "Provence"],
          priceRange: "€€",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Marseille",
            addressRegion: "Provence-Alpes-Côte d'Azur",
            addressCountry: "FR",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="bottom-center" />
    </QueryClientProvider>
  );
}
