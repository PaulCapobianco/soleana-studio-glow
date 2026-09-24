import { Link } from "@tanstack/react-router";
import { Reveal } from "./Reveal";

// The four portfolio category pages are separate static routes (not a
// dynamic /portfolio/$slug route), so `to` must be one of these exact
// literals for TanStack Router's typed Link — a template string like
// `/portfolio/${slug}` doesn't match any registered route.
const portfolioRoutes = {
  grossesse: "/portfolio/grossesse",
  famille: "/portfolio/famille",
  couple: "/portfolio/couple",
  portrait: "/portfolio/portrait",
} as const;

type PortfolioCategorySlug = keyof typeof portfolioRoutes;

interface RelatedCategory {
  label: string;
  slug: PortfolioCategorySlug;
  icon?: string;
}

interface RelatedCategoriesProps {
  categories: readonly RelatedCategory[];
  currentSlug: PortfolioCategorySlug;
}

export function RelatedCategories({ categories, currentSlug }: RelatedCategoriesProps) {
  const filtered = categories.filter((c) => c.slug !== currentSlug);

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-8 text-center">
            Découvrir aussi
          </p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((category) => (
            <Reveal key={category.slug} delay={100}>
              <Link
                to={portfolioRoutes[category.slug]}
                className="relative group overflow-hidden rounded-lg aspect-video bg-muted border border-border transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center"
              >
                <span className="text-sm md:text-base font-display italic text-foreground text-center px-4">
                  {category.label}
                </span>
                <div className="absolute inset-0 bg-accent/0 transition-colors duration-500 group-hover:bg-accent/10" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
