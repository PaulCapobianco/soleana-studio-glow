import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PortfolioEditorialSection } from "@/components/site/PortfolioEditorialSection";
import { buildPageSeo } from "@/lib/seo";
import { STORAGE_GALLERIES_ENABLED } from "@/lib/photos/flags";

// Page /portfolio proprement dite quand BUG-02 est actif (interrupteur Storage allumé) ; sinon la
// route de mise en page /portfolio la rend et celle-ci ne rend rien.
export const Route = createFileRoute("/portfolio/")({
  head: () =>
    STORAGE_GALLERIES_ENABLED
      ? buildPageSeo({
          title: "Portfolio — Soleana Studio, photographe Marseille",
          description:
            "Galerie de photos lifestyle : grossesse, famille, couple, portrait. Photographe à Marseille et alentours.",
          path: "/portfolio",
          ogTitle: "Portfolio — Soleana Studio",
          ogDescription: "Galerie photos lifestyle Marseille.",
        })
      : {},
  component: STORAGE_GALLERIES_ENABLED ? Portfolio : () => null,
});

function Portfolio() {
  return (
    <SiteShell>
      <PortfolioEditorialSection />
    </SiteShell>
  );
}
