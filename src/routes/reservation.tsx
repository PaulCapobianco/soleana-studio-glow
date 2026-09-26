import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { ConsentEmbed } from "@/components/site/ConsentEmbed";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/reservation")({
  head: () =>
    buildPageSeo({
      title: "Prendre rendez-vous — Soleana Studio",
      description:
        "Prenez rendez-vous en ligne avec Soleana Studio via l'intégration Pelli dédiée à la réservation.",
      path: "/reservation",
      ogTitle: "Prendre rendez-vous — Soleana Studio",
      ogDescription: "Réservation en ligne pour votre séance photo avec Soleana Studio.",
    }),
  component: Reservation,
});

function Reservation() {
  return (
    <SiteShell>
      <section className="px-6 pb-14 pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
              Soleana Studio
            </p>
            <h1 className="font-display text-5xl italic text-primary md:text-6xl">
              Prendre rendez-vous
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Réservez directement votre séance photo en ligne grâce à l’intégration Pelli dédiée.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-6xl">
          <Reveal delay={100}>
            <div className="overflow-hidden rounded-[32px] border border-border bg-surface shadow-[0_28px_80px_-56px_rgba(62,47,40,0.24)]">
              <div className="border-b border-border/70 px-6 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
                  Prise de rendez-vous
                </p>
                <h2 className="mt-3 font-display text-3xl italic text-primary">
                  Choisissez votre créneau
                </h2>
              </div>
              <ConsentEmbed
                src="https://soleana-studio.pelli.io/embedded/booking"
                title="Réservation en ligne Soleana Studio"
                subject="Le calendrier de réservation"
                height="700"
                className="block w-full border-0 bg-[#FAF6EF]"
                placeholderClassName="min-h-[20rem]"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
