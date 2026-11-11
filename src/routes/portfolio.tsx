import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PortfolioEditorialSection } from "@/components/site/PortfolioEditorialSection";
import { buildPageSeo } from "@/lib/seo";
import { STORAGE_GALLERIES_ENABLED } from "@/lib/photo-storage";

// BUG-02 (0a23b0f) est actif seulement avec VITE_GALLERIES_FROM_STORAGE=true : /portfolio devient une
// route de mise en page et /portfolio/<categorie> s'affiche dans l'outlet. Interrupteur éteint : le
// comportement historique est strictement conservé (pas de galeries vides exposées).
export const Route = createFileRoute("/portfolio")({
  head: () =>
    STORAGE_GALLERIES_ENABLED
      ? {}
      : buildPageSeo({
          title: "Portfolio — Soleana Studio, photographe Marseille",
          description:
            "Galerie de photos lifestyle : grossesse, famille, couple, portrait. Photographe à Marseille et alentours.",
          path: "/portfolio",
          ogTitle: "Portfolio — Soleana Studio",
          ogDescription: "Galerie photos lifestyle Marseille.",
        }),
  component: STORAGE_GALLERIES_ENABLED ? () => <Outlet /> : Portfolio,
});

function Portfolio() {
  return (
    <SiteShell>
      <PortfolioEditorialSection />
    </SiteShell>
  );
}
