import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/mentions-legales")({
  head: () =>
    buildPageSeo({
      title: "Mentions légales — Soleana Studio",
      description:
        "Mentions légales de Soleana Studio, photographe professionnelle à Marseille. Informations d'éditeur, hébergeur, propriété intellectuelle et données personnelles.",
      path: "/mentions-legales",
      ogTitle: "Mentions légales — Soleana Studio",
      ogDescription:
        "Informations légales de Soleana Studio : éditeur, hébergeur Cloudflare, propriété intellectuelle, données personnelles et contact.",
    }),
  component: LegalNoticePage,
});

function LegalNoticePage() {
  return (
    <SiteShell>
      <section className="px-6 pb-24 pt-40">
        <div className="mx-auto max-w-3xl">
          <header className="mb-10">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
              Soleana Studio
            </p>
            <h1 className="font-display text-4xl italic text-primary md:text-5xl">
              Mentions légales
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Les informations ci-dessous présentent l&apos;éditeur du site, l&apos;hébergeur, les
              droits de propriété intellectuelle, ainsi que les règles applicables à la collecte et
              à l&apos;utilisation des données personnelles.
            </p>
          </header>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
            <LegalSection title="1. Éditeur du site">
              <p>
                Ce site est édité par{" "}
                <strong className="text-foreground">Anaïs Charton - Soléana Studio</strong>.
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <strong className="text-foreground">Activité :</strong> Photographe
                  professionnelle
                </li>
                <li>
                  <strong className="text-foreground">Statut :</strong> Micro-entrepreneuse
                </li>
                <li>
                  <strong className="text-foreground">SIRET :</strong> 83168145700030
                </li>
                <li>
                  <strong className="text-foreground">E-mail :</strong>{" "}
                  <a
                    href="mailto:anaischartonphotographie@gmail.com"
                    className="text-foreground story-link"
                  >
                    anaischartonphotographie@gmail.com
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Responsable de la publication :</strong> Anaïs
                  Charton
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="2. Hébergeur du site">
              <p>Ce site est hébergé par Cloudflare.</p>
              <ul className="mt-4 space-y-2">
                <li>
                  <strong className="text-foreground">Hébergeur :</strong> Cloudflare, Inc.
                </li>
                <li>
                  <strong className="text-foreground">Adresse :</strong> 101 Townsend St, San
                  Francisco, CA 94107, États-Unis
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="3. Propriété intellectuelle">
              <p>
                L&apos;ensemble des éléments présents sur ce site, notamment les textes, les
                photographies, le logo, l&apos;identité visuelle et la mise en page, est protégé par
                le droit d&apos;auteur.
              </p>
              <p className="mt-4">
                Ces éléments sont la propriété exclusive de Anaïs Charton / Soléana Studio, sauf
                mention contraire. Toute reproduction, modification, diffusion ou exploitation,
                totale ou partielle, est interdite sans autorisation écrite préalable.
              </p>
            </LegalSection>

            <LegalSection title="4. Utilisation des données personnelles">
              <p>
                Ce site peut collecter des données personnelles via les formulaires de contact, les
                demandes de devis ou d&apos;informations par e-mail, ainsi que les échanges
                commerciaux et la réservation en ligne.
              </p>
              <p className="mt-4">
                Les données collectées sont limitées au nécessaire, par exemple : nom, e-mail,
                téléphone et message. Elles servent uniquement à répondre aux demandes, préparer une
                prestation et assurer le suivi client.
              </p>
              <p className="mt-4">
                Ces données ne sont jamais revendues, ni cédées, ni transmises à des tiers, sauf
                obligation légale.
              </p>
            </LegalSection>

            <LegalSection title="5. Conservation et droits des utilisateurs">
              <p>
                Conformément au RGPD et à la loi « Informatique et Libertés », vous disposez des
                droits suivants : droit d&apos;accès, droit de rectification, droit
                d&apos;opposition et droit de suppression de vos données.
              </p>
              <p className="mt-4">
                Pour exercer vos droits, vous pouvez écrire à{" "}
                <a
                  href="mailto:anaischartonphotographie@gmail.com"
                  className="text-foreground story-link"
                >
                  anaischartonphotographie@gmail.com
                </a>
                .
              </p>
              <p className="mt-4">
                Les données sont conservées uniquement pendant la durée nécessaire aux échanges et
                au suivi administratif légal.
              </p>
            </LegalSection>

            <LegalSection title="6. Cookies">
              <p>
                Ce site peut utiliser des cookies nécessaires à son fonctionnement, ainsi que, le
                cas échéant, des cookies liés à des services tiers intégrés ou à la mesure
                d&apos;audience.
              </p>
              <p className="mt-4">
                En poursuivant votre navigation, vous acceptez l&apos;utilisation éventuelle de ces
                cookies. Vous pouvez les désactiver à tout moment dans les paramètres de votre
                navigateur.
              </p>
            </LegalSection>

            <LegalSection title="7. Limitation de responsabilité">
              <p>
                L&apos;éditrice du site s&apos;efforce de fournir des informations exactes et
                régulièrement mises à jour. Cependant, elle ne peut garantir l&apos;absence
                d&apos;erreurs ou d&apos;omissions involontaires.
              </p>
              <p className="mt-4">
                L&apos;accès au site peut être momentanément interrompu en cas de maintenance ou de
                problème technique.
              </p>
            </LegalSection>

            <LegalSection title="8. Crédits">
              <p>Site réalisé par Paul Capobianco.</p>
              <p className="mt-4">Photographies : Anaïs Charton, sauf mention spécifique.</p>
            </LegalSection>

            <LegalSection title="9. Conditions générales de vente">
              <p>
                Les prestations photo sont soumises à des Conditions Générales de Vente (CGV)
                disponibles sur demande ou transmises avant la signature d&apos;un contrat ou
                d&apos;un devis.
              </p>
            </LegalSection>

            <LegalSection title="10. Contact">
              <p>Pour toute question, vous pouvez contacter Soleana Studio :</p>
              <ul className="mt-4 space-y-2">
                <li>
                  <strong className="text-foreground">E-mail :</strong>{" "}
                  <a href="mailto:contact@soleanastudio.fr" className="text-foreground story-link">
                    contact@soleanastudio.fr
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Téléphone :</strong>{" "}
                  <a href="tel:+33667536312" className="text-foreground story-link">
                    06.67.53.63.12
                  </a>
                </li>
              </ul>
            </LegalSection>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border bg-surface/90 p-6 shadow-[0_24px_70px_-54px_rgba(62,47,40,0.22)] md:p-7">
      <h2 className="font-display text-2xl italic text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
