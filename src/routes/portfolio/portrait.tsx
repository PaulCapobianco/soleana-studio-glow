import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryHero } from "@/components/site/CategoryHero";
import { CategoryGallery } from "@/components/site/CategoryGallery";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { RelatedCategories } from "@/components/site/RelatedCategories";
import { buildPageSeo } from "@/lib/seo";
import catP from "@/assets/portrait/portrait_1/20251025-img5650.webp";

export const Route = createFileRoute("/portfolio/portrait")({
  head: () =>
    buildPageSeo({
      title: "Photographe portrait Marseille | Soleana Studio",
      description:
        "Découvrez les séances portrait de Soleana Studio à Marseille : des images naturelles, modernes et élégantes pour vous mettre en valeur.",
      path: "/portfolio/portrait",
      ogTitle: "Séance portrait à Marseille | Soleana Studio",
      ogDescription: "Des portraits naturels et élégants qui révèlent votre personnalité.",
    }),
  component: PortraitPage,
});

function PortraitPage() {
  const experienceSteps = [
    {
      icon: "🪞",
      title: "Avant la séance",
      description:
        "On parle de vous : ce que vous aimez, votre univers, votre style. Pas de questions bizarres, juste une vraie conversation.",
    },
    {
      icon: "📸",
      title: "Pendant la séance",
      description:
        "On prend le temps. On cherche l'angle qui vous met en valeur, la lumière qui vous sublime. Vous êtes beau·elle, montrons-le.",
    },
    {
      icon: "🌟",
      title: "Après la séance",
      description:
        "Vous recevez des images qui racontent qui vous êtes : vrai, naturel, confiant. Des photos dont vous êtes fier·ère.",
    },
  ];

  const relatedCategories = [
    { label: "Couple", slug: "couple" },
    { label: "Maternité", slug: "grossesse" },
    { label: "Famille", slug: "famille" },
  ];

  return (
    <SiteShell>
      <CategoryHero
        title="Séance portrait à Marseille"
        description="Une séance portrait pour révéler votre personnalité avec douceur, naturel et élégance, dans une ambiance bienveillante et lumineuse."
        imageSrc={catP}
        imageAlt="Séance portrait"
      />

      <section className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="prose max-w-none mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vous avez une belle histoire à raconter. Pas besoin de sourire figé ou de pose
                compliquée pour la dire.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Une séance portrait chez Soleana Studio, c'est trouver la lumière qui vous sublime,
                l'angle qui vous met en valeur, l'expression qui vous ressemble vraiment. C'est du
                temps pour vous, sans stresse. Et en retour, des images qui vous rendent confiant·e
                et fier·ère.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-8">
              Galerie portrait
            </p>
          </Reveal>

          <Reveal delay={120}>
            <CategoryGallery categorySlug="portrait" />
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
              Prêt·e à découvrir comment vous êtes vraiment beau·elle ?
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

      <RelatedCategories categories={relatedCategories} currentSlug="portrait" />
    </SiteShell>
  );
}
