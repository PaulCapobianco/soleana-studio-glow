import { createFileRoute } from "@tanstack/react-router";

import { GoogleIcon } from "@/components/site/GoogleIcon";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { ConsentEmbed } from "@/components/site/ConsentEmbed";
import { useSiteSettings } from "@/lib/site-settings";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/espace-client")({
  head: () =>
    buildPageSeo({
      title: "Espace client — Soleana Studio",
      description:
        "Accédez à votre espace client Soleana Studio pour retrouver vos informations et votre suivi en ligne via Pelli.",
      path: "/espace-client",
      ogTitle: "Espace client — Soleana Studio",
      ogDescription: "Accès client sécurisé pour Soleana Studio via Pelli.",
      noIndex: true,
    }),
  component: EspaceClient,
});

function EspaceClient() {
  const { googleReviewUrl } = useSiteSettings();
  return (
    <SiteShell>
      <section className="px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 md:pb-12 md:pt-32 lg:pt-36">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-accent sm:mb-4">
              Soleana Studio
            </p>
            <h1 className="text-balance font-display text-3xl italic text-primary sm:text-4xl md:text-5xl lg:text-6xl">
              Espace client
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-7 sm:text-base md:text-lg">
              Accédez à votre espace client sécurisé. Une fois le code saisi, Pelli vous redirige
              vers votre contenu privé.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 md:pb-24 lg:pb-28">
        <div className="mx-auto max-w-5xl lg:max-w-6xl">
          <Reveal delay={100}>
            <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-[0_28px_80px_-56px_rgba(62,47,40,0.24)] sm:rounded-[32px]">
              <div className="border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
                  Espace client
                </p>
                <h2 className="mt-2 font-display text-xl italic text-primary sm:mt-3 sm:text-2xl md:text-3xl">
                  Vos contenus privés
                </h2>
              </div>
              <ConsentEmbed
                src="https://soleana-studio.pelli.io/embedded"
                title="Espace client Soleana Studio"
                subject="L'espace client"
                height="700"
                scrolling="yes"
                placeholderClassName="min-h-[20rem]"
                className="block w-full border-0 bg-[#FAF6EF] h-[max(82dvh,760px)] sm:h-[max(84dvh,820px)] md:h-[max(86dvh,860px)] lg:h-[max(88dvh,920px)]"
              />
            </div>
          </Reveal>

          <Reveal className="mt-8 flex justify-center" delay={160}>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Laisser un avis Google pour Soleana Studio"
              className="inline-flex items-center gap-3 rounded-full border border-[#D9C3AF] bg-[#FFFDF8] px-6 py-3.5 text-sm font-semibold text-foreground shadow-[0_16px_40px_-28px_rgba(62,47,40,0.22)] transition-all hover:-translate-y-0.5 hover:border-[#C6966F] hover:shadow-[0_18px_44px_-28px_rgba(198,150,111,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <GoogleIcon className="h-7 w-7 shrink-0" />
              <span>Laisser un avis Google</span>
            </a>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
