import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryHero } from "@/components/site/CategoryHero";
import { CategoryGallery } from "@/components/site/CategoryGallery";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { RelatedCategories } from "@/components/site/RelatedCategories";
import { buildPageSeo } from "@/lib/seo";
import catF from "@/assets/famille/famille_1/04042026-vv7a3177.webp";

export const Route = createFileRoute("/portfolio/famille")({
  head: () =>
    buildPageSeo({
      title: "Photographe famille Marseille | Soleana Studio",
      description:
        "Séance photo famille à Marseille avec Soleana Studio : des souvenirs naturels, lumineux et authentiques à partager en famille.",
      path: "/portfolio/famille",
      ogTitle: "Séance photo famille à Marseille | Soleana Studio",
      ogDescription: "Des souvenirs naturels et joyeux de votre famille.",
    }),
  component: FamillePage,
});

function FamillePage() {
  const experienceSteps = [
    {
      icon: "👨‍👩‍👧‍👦",
      title: "Avant la séance",
      description:
        "On discute de votre famille, de ce qui vous fait rire ensemble, de vos petits rituels. Pas de tenues formelles imposées, juste du naturel.",
    },
    {
      icon: "📸",
      title: "Pendant la séance",
      description:
        "On capture les rires, les jeux, les regards complices. Les câlins spontanés, les courses folles, tous ces petits moments qui font la vie.",
    },
    {
      icon: "🎁",
      title: "Après la séance",
      description:
        "Vous repartez avec des images plein d'authenticité. Des photos qu'on regarde en souriant, encore et encore, pendant des années.",
    },
  ];

  const relatedCategories = [
    { label: "Couple", slug: "couple" },
    { label: "Maternité", slug: "grossesse" },
    { label: "Portrait", slug: "portrait" },
  ];

  return (
    <SiteShell>
      <CategoryHero
        title="Séance photo famille à Marseille"
        description="Des photos naturelles et spontanées pour raconter votre famille telle qu'elle est : vivante, tendre, joyeuse et pleine de petits instants précieux."
        imageSrc={catF}
        imageAlt="Séance photo famille"
      />

      <section className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="prose max-w-none mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Votre famille, c'est du mouvement, du bruit, des sourires. C'est authentique, c'est
                réel, c'est beau.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Une séance famille chez Soleana Studio, c'est oublier la caméra et simplement être
                ensemble. On capture vos instants vrais, les rires qui fusent, les regards tendres,
                les petites mains qui se cherchent. Des photos qui sentent bon la vie, exactement
                comme vous la vivez.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-8">
              Galerie famille
            </p>
          </Reveal>

          <Reveal delay={120}>
            <CategoryGallery categorySlug="famille" />
          </Reveal>
        </div>
      </section>

      <ExperienceSection steps={experienceSteps} />

      <section className="py-12 px-6 text-center border-t border-border">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
        >
          ← RETOUR AUX RÉALISATIONS
        </Link>
      </section>

      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <p className="text-lg text-muted-foreground mb-8">
              Prêt·e à immortaliser ces moments précieux en famille ?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full bg-[#C6966F] px-8 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#b8845f]"
              >
                RÉSERVER UNE SÉANCE
              </Link>
              <Link
                to="/prestations"
                className="inline-flex items-center justify-center rounded-full border border-[#C6966F] bg-background px-8 py-3 text-sm uppercase tracking-[0.3em] text-[#C6966F] transition hover:bg-[#C6966F] hover:text-white"
              >
                VOIR LES TARIFS
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <RelatedCategories categories={relatedCategories} currentSlug="famille" />
    </SiteShell>
  );
}
