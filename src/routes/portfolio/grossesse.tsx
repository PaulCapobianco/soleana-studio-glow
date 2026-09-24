import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryHero } from "@/components/site/CategoryHero";
import { CategoryGallery } from "@/components/site/CategoryGallery";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { RelatedCategories } from "@/components/site/RelatedCategories";
import { buildPageSeo } from "@/lib/seo";
import catG from "@/assets/grossesse/grossesse_1/20220418-img7441.webp";

export const Route = createFileRoute("/portfolio/grossesse")({
  head: () =>
    buildPageSeo({
      title: "Photographe maternité Marseille | Soleana Studio",
      description:
        "Immortalisez votre grossesse avec une séance photo maternité naturelle et élégante à Marseille et alentours avec Soleana Studio.",
      path: "/portfolio/grossesse",
      ogTitle: "Séance photo maternité à Marseille | Soleana Studio",
      ogDescription: "Captures douces et lumineuses de votre attente précieuse.",
    }),
  component: GrossessePage,
});

function GrossessePage() {
  const experienceSteps = [
    {
      icon: "👶",
      title: "Avant la séance",
      description:
        "On parle ensemble de cette période magique. Vous choisissez le style : en tenue spéciale, en jeans confortable, en couple ou seule. Tout ce qui vous ressemble.",
    },
    {
      icon: "📸",
      title: "Pendant la séance",
      description:
        "On capture votre ventre rond, vos mains qui le caressent, vos regards vers ce bébé qui arrive. Des moments d'intimité et de tendresse immortalisés.",
    },
    {
      icon: "💝",
      title: "Après la séance",
      description:
        "Vous repartez avec des images qui raconteront à votre enfant : c'est comme ça qu'on vous attendait, comme ça qu'on rêvait de vous.",
    },
  ];

  const relatedCategories = [
    { label: "Couple", slug: "couple" },
    { label: "Famille", slug: "famille" },
    { label: "Portrait", slug: "portrait" },
  ] as const;

  return (
    <SiteShell>
      <CategoryHero
        title="Séance photo maternité à Marseille"
        description="Une séance maternité pour garder une trace douce et lumineuse de cette période unique, entre attente, tendresse et émotions."
        imageSrc={catG}
        imageAlt="Séance photo maternité"
      />

      <section className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="prose max-w-none mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Votre ventre s'arrondit, votre cœur aussi. Cette attente est précieuse, fragile,
                remplie d'émotions. Elle mérite d'être immortalisée.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Une séance maternité chez Soleana Studio, c'est un moment pour vous. On capture
                votre transformation, votre douceur, cette force douce qui vous habite. Des images
                que vous pourrez un jour montrer à votre enfant : "voilà comment je rêvais de toi".
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-8">
              Galerie maternité
            </p>
          </Reveal>

          <Reveal delay={120}>
            <CategoryGallery categorySlug="grossesse" />
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
              Prêt·e à garder une trace de cette belle attente ?
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

      <RelatedCategories categories={relatedCategories} currentSlug="grossesse" />
    </SiteShell>
  );
}
