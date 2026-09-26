import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PortfolioEditorialSection } from "@/components/site/PortfolioEditorialSection";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/portfolio/")({
  head: () =>
    buildPageSeo({
      title: "Portfolio — Soleana Studio, photographe Marseille",
      description:
        "Galerie de photos lifestyle : grossesse, famille, couple, portrait. Photographe à Marseille et alentours.",
      path: "/portfolio",
      ogTitle: "Portfolio — Soleana Studio",
      ogDescription: "Galerie photos lifestyle Marseille.",
    }),
  component: Portfolio,
});

function Portfolio() {
  return (
    <SiteShell>
      <PortfolioEditorialSection />
    </SiteShell>
  );
}
