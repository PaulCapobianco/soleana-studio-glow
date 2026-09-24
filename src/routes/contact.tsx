import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import fondContact from "@/assets/fond_contact.webp";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { TikTokIcon } from "@/components/site/TikTokIcon";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildPageSeo({
      title: "Contact — Soleana Studio",
      description:
        "Contactez Soleana Studio pour une séance photo à Marseille et alentours. Réponse rapide et réservation en ligne.",
      path: "/contact",
      ogTitle: "Contact — Soleana Studio",
      ogDescription: "Réservez votre séance photo en ligne.",
    }),
  component: Contact,
});

function Contact() {
  return (
    <SiteShell>
      <div className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${fondContact})`, backgroundPosition: "center 18%" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,250,243,0.44)_0%,rgba(255,250,243,0.58)_32%,rgba(255,250,243,0.72)_68%,rgba(255,250,243,0.84)_100%)]" />

        <section className="px-6 pb-14 pt-40">
          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="hidden lg:block" aria-hidden="true" />
            <div className="flex flex-col items-center text-center">
              <Reveal>
                <p
                  className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-accent"
                  style={{
                    filter: "drop-shadow(0 0 14px rgba(198, 150, 111, 0.48))",
                    textShadow:
                      "0 0 3px rgba(198, 150, 111, 1), 0 0 14px rgba(198, 150, 111, 0.72), 0 0 34px rgba(198, 150, 111, 0.42)",
                  }}
                >
                  Soleana Studio
                </p>
                <h1 className="text-balance font-display text-5xl italic text-primary md:text-6xl">
                  Parlons de votre séance
                </h1>
              </Reveal>
              <Reveal delay={100}>
                <p className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-foreground/80">
                  Une question ou une envie ? Vous pouvez me contacter ici. Pour prendre
                  rendez-vous, rendez-vous sur la page dédiée accessible juste après le formulaire.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="px-6 pb-32 pt-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <Reveal className="space-y-6 text-sm">
              <ContactBlock label="Email">
                <a href="mailto:contact@soleanastudio.fr" className="text-foreground story-link">
                  contact@soleanastudio.fr
                </a>
              </ContactBlock>

              <ContactBlock label="Téléphone">
                <a href="tel:+33667536312" className="text-foreground story-link">
                  06.67.53.63.12
                </a>
              </ContactBlock>

              <ContactBlock label="Réseaux">
                <div className="mt-2 flex gap-3">
                  <SocialButton
                    href="https://instagram.com/soleana.studio"
                    label="Instagram"
                    className="bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]"
                  >
                    <Instagram className="h-4 w-4" />
                  </SocialButton>

                  <SocialButton
                    href="mailto:contact@soleanastudio.fr"
                    label="Email"
                    className="border-[#C6966F]/40 bg-[#FFF6ED] text-[#B36F45] shadow-[0_10px_18px_-14px_rgba(179,111,69,0.5)]"
                  >
                    <Mail className="h-4 w-4 text-[#C6966F]" />
                  </SocialButton>

                  <SocialButton
                    href="https://www.tiktok.com/@soleana.studio"
                    label="TikTok"
                    className="bg-black text-white shadow-[0_10px_18px_-14px_rgba(0,0,0,0.5)]"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </SocialButton>

                  <SocialButton
                    href="https://wa.me/33667536312"
                    label="WhatsApp"
                    className="bg-[#25D366] text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </SocialButton>
                </div>
              </ContactBlock>
            </Reveal>

            <div className="space-y-8">
              <Reveal delay={100}>
                <div className="overflow-hidden rounded-[32px] border border-border bg-[#FFFDF8]/98 shadow-[0_28px_80px_-56px_rgba(62,47,40,0.24)] backdrop-blur-[2px]">
                  <div className="border-b border-border/70 px-6 py-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
                      Formulaire de contact
                    </p>
                    <h2 className="mt-3 font-display text-3xl italic text-primary">Écrivez-moi</h2>
                  </div>
                  <iframe
                    src="https://soleana-studio.pelli.io/embedded/contact"
                    title="Formulaire de contact Soleana Studio"
                    width="100%"
                    height="600"
                    loading="lazy"
                    className="block w-full border-0 bg-[#FAF6EF]/95"
                  />
                </div>
              </Reveal>

              <Reveal delay={220}>
                <div className="rounded-[28px] border border-[#E8DCCF] bg-[#FFFDF8]/98 p-6 shadow-[0_20px_60px_-44px_rgba(62,47,40,0.18)] backdrop-blur-[2px]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#C89B7B]">
                    Demande de devis
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80 md:text-base">
                    Pour toute demande de devis pour un reportage photo, merci d&apos;indiquer le
                    maximum d&apos;informations nécessaires à l&apos;établissement du devis, comme
                    les horaires et la durée de présence souhaitée, le(s) lieu(x) où se déroulera
                    l&apos;évènement, le nombre d&apos;invités et bien entendu la date.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80 md:text-base">
                    Cela me permettra d&apos;établir un premier devis que nous pourrons affiner par
                    la suite si besoin.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80 md:text-base">
                    Je vous remercie pour l&apos;intérêt que vous portez à mon travail, je réponds
                    généralement à vos demandes sous 72h maximum hors week-end et jours fériés.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function ContactBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p
        className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent"
        style={{
          filter: "drop-shadow(0 0 14px rgba(198, 150, 111, 0.48))",
          textShadow:
            "0 0 3px rgba(198, 150, 111, 1), 0 0 14px rgba(198, 150, 111, 0.72), 0 0 34px rgba(198, 150, 111, 0.42)",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function SocialButton({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      aria-label={label}
      className={`grid aspect-square h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-transparent text-white shadow-[0_10px_18px_-14px_rgba(62,47,40,0.35)] transition-transform duration-200 hover:scale-105 ${className}`}
    >
      {children}
    </a>
  );
}
