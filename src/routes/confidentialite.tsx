import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { buildPageSeo } from "@/lib/seo";

export const Route = createFileRoute("/confidentialite")({
  head: () =>
    buildPageSeo({
      title: "Politique de confidentialité — Soleana Studio",
      description:
        "Politique de confidentialité de Soleana Studio : données collectées, finalités, destinataires, conservation, cookies et droits RGPD.",
      path: "/confidentialite",
      ogTitle: "Politique de confidentialité — Soleana Studio",
      ogDescription:
        "Informations sur la collecte, l'utilisation et la protection des données personnelles chez Soleana Studio.",
    }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <SiteShell>
      <section className="px-6 pb-24 pt-40">
        <div className="mx-auto max-w-3xl">
          <header className="mb-10">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
              Soleana Studio
            </p>
            <h1 className="font-display text-4xl italic text-primary md:text-5xl">
              Politique de confidentialité
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Cette politique explique comment Soleana Studio collecte, utilise et protège les
              données personnelles des personnes qui visitent le site, utilisent les formulaires de
              contact, l&apos;espace client ou la prise de rendez-vous en ligne.
            </p>
          </header>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
            <LegalSection title="1. Responsable du traitement">
              <p>
                Le responsable du traitement des données personnelles est{" "}
                <strong className="text-foreground">Anaïs Charton - Soléana Studio</strong>.
              </p>
              <p className="mt-4">
                Pour toute question relative à vos données personnelles, vous pouvez écrire à{" "}
                <a href="mailto:contact@soleanastudio.fr" className="text-foreground story-link">
                  contact@soleanastudio.fr
                </a>
                .
              </p>
            </LegalSection>

            <LegalSection title="2. Données collectées">
              <p>
                Selon les fonctionnalités utilisées, Soleana Studio peut collecter les données que
                vous transmettez volontairement via les formulaires intégrés, notamment votre nom,
                prénom, adresse e-mail, numéro de téléphone, message, informations relatives à la
                séance souhaitée et, le cas échéant, les éléments utiles à l&apos;établissement d’un
                devis ou d’une réservation.
              </p>
              <p className="mt-4">
                Des données techniques limitées peuvent également être traitées pour assurer le bon
                fonctionnement du site, sa sécurité et la gestion des cookies ou services tiers
                intégrés.
              </p>
            </LegalSection>

            <LegalSection title="3. Finalités et bases légales">
              <p>
                Les données collectées servent uniquement à répondre à vos demandes, préparer une
                prestation, gérer une réservation, assurer le suivi client et, plus largement,
                permettre la bonne exécution des services proposés par Soleana Studio.
              </p>
              <p className="mt-4">
                Le traitement repose, selon les cas, sur l&apos;exécution de mesures
                précontractuelles, l&apos;exécution d&apos;un contrat, l&apos;intérêt légitime du
                responsable de traitement à répondre aux demandes reçues et, pour les cookies ou
                services non essentiels, sur votre consentement lorsque celui-ci est requis.
              </p>
            </LegalSection>

            <LegalSection title="4. Destinataires des données">
              <p>
                Les données sont accessibles uniquement par Soleana Studio et par les prestataires
                techniques strictement nécessaires au fonctionnement du site et de ses services
                associés, notamment l&apos;hébergement, les formulaires intégrés et les solutions de
                réservation ou d&apos;espace client.
              </p>
              <p className="mt-4">
                Ces prestataires interviennent en qualité de sous-traitants ou de services tiers,
                uniquement pour les besoins techniques de la plateforme.
              </p>
            </LegalSection>

            <LegalSection title="5. Durée de conservation">
              <p>
                Les données sont conservées pendant la durée nécessaire au traitement de votre
                demande, à la préparation ou à l&apos;exécution de la prestation, puis archivées
                lorsque cela est nécessaire pour des obligations légales ou pour la gestion des
                délais de prescription applicables.
              </p>
              <p className="mt-4">
                Les durées de conservation sont définies en fonction de la finalité du traitement et
                ne sont pas illimitées.
              </p>
            </LegalSection>

            <LegalSection title="6. Transferts hors Union européenne">
              <p>
                Certains prestataires techniques utilisés par le site peuvent être situés en dehors
                de l&apos;Union européenne ou y transférer certaines données dans le cadre de leurs
                services.
              </p>
              <p className="mt-4">
                Lorsque cela est le cas, Soleana Studio veille à ce que des garanties appropriées
                soient mises en place conformément au RGPD.
              </p>
            </LegalSection>

            <LegalSection title="7. Vos droits">
              <p>
                Conformément au RGPD et à la loi « Informatique et Libertés », vous disposez
                d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
                d&apos;opposition, de limitation du traitement et, lorsque cela s&apos;applique, de
                portabilité de vos données.
              </p>
              <p className="mt-4">
                Vous pouvez exercer ces droits en écrivant à{" "}
                <a href="mailto:contact@soleanastudio.fr" className="text-foreground story-link">
                  contact@soleanastudio.fr
                </a>
                .
              </p>
              <p className="mt-4">
                Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés,
                vous pouvez introduire une réclamation auprès de la CNIL.
              </p>
            </LegalSection>

            <LegalSection title="8. Cookies et traceurs">
              <p>
                Le site peut utiliser des cookies strictement nécessaires à son fonctionnement et,
                selon les services intégrés, des cookies ou traceurs déposés par des tiers, par
                exemple pour les formulaires, l&apos;espace client ou la réservation en ligne.
              </p>
              <p className="mt-4">
                Les cookies non essentiels ne devraient être déposés qu&apos;avec votre consentement
                lorsque la réglementation l&apos;exige. Vous pouvez également configurer votre
                navigateur pour limiter ou supprimer les cookies.
              </p>
            </LegalSection>

            <LegalSection title="9. Sécurité des données">
              <p>
                Soleana Studio met en œuvre des mesures techniques et organisationnelles adaptées
                pour protéger les données personnelles contre la perte, l&apos;accès non autorisé,
                la divulgation ou l&apos;altération.
              </p>
            </LegalSection>

            <LegalSection title="10. Contact">
              <p>
                Pour toute question sur cette politique ou sur l&apos;utilisation de vos données,
                vous pouvez contacter Soleana Studio :
              </p>
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
