import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryHero } from "@/components/site/CategoryHero";
import { CategoryGallery } from "@/components/site/CategoryGallery";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { RelatedCategories } from "@/components/site/RelatedCategories";
import { buildPageSeo } from "@/lib/seo";
import catC from "@/assets/couple/couple_3/fiancailles-marisol-and-maxence-1.webp";

export const Route = createFileRoute("/portfolio/couple")({
  head: () =>
    buildPageSeo({
      title: "Photographe couple Marseille | Soleana Studio",
      description:
        "Découvrez les séances photo couple de Soleana Studio à Marseille et alentours : des images naturelles, lumineuses et pleines d'émotion.",
      path: "/portfolio/couple",
      ogTitle: "Séance photo couple à Marseille | Soleana Studio",
      ogDescription: "Des images naturelles et lumineuses de votre histoire à deux.",
    }),
  component: CouplePage,
});

function CouplePage() {
  const experienceSteps = [
    {
      icon: "💬",
      title: "Avant la séance",
      description:
        "On échange ensemble sur votre histoire, vos envies et le style de photos qui vous fait craquer. Un moment pour se connaître et créer la confiance.",
    },
    {
      icon: "📸",
      title: "Pendant la séance",
      description:
        "On capture vos moments en toute naturel : les regards, les rires, les gestes tendres. Pas de poses figées, juste votre authenticité.",
    },
    {
      icon: "✨",
      title: "Après la séance",
      description:
        "Vous recevez vos images retouchées, avec des tirages ou un album si vous le souhaitez. Des souvenirs à conserver et à chérir.",
    },
  ];

  const relatedCategories = [
    { label: "Maternité", slug: "grossesse" },
    { label: "Famille", slug: "famille" },
    { label: "Portrait", slug: "portrait" },
  ] as const;

  return (
    <SiteShell>
      <CategoryHero
        title="Séance photo couple à Marseille"
        description="Une séance couple est une parenthèse à deux, pensée pour capturer les gestes tendres, les regards complices et les instants vrais qui racontent votre histoire."
        imageSrc={catC}
        imageAlt="Séance photo couple"
      />

      <section className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="prose max-w-none mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vous vous aimez. C'est simple, c'est vrai, et ça mérite d'être immortalisé avec
                douceur et élégance.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                Une séance couple chez Soleana Studio, c'est le temps de vous : on pose l'appareil
                photo de côté quelques minutes pour discuter, se rire au nez, créer l'ambiance
                juste. Et puis, on capture tout ce qui se passe ensuite — les vrais moments, les
                sourires, cette complicité unique qui n'appartient qu'à vous deux.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-8">
              Galerie couple
            </p>
          </Reveal>

          <Reveal delay={120}>
            <CategoryGallery categorySlug="couple" />
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
              Prêt·e à capturer votre histoire à deux ?
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

      <RelatedCategories categories={relatedCategories} currentSlug="couple" />
    </SiteShell>
  );
}
