import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { buildPageSeo } from "@/lib/seo";
import { useSiteSettings } from "@/lib/site-settings";

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
  const settings = useSiteSettings();
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
                <a href={`mailto:${settings.email}`} className="text-foreground story-link">
                  {settings.email}
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
                Vos données sont destinées uniquement à Soleana Studio. Elles sont traitées, pour son
                compte, par les prestataires techniques suivants : Pelli, qui fournit le formulaire
                de contact, la réservation en ligne et l&apos;espace client ; Supabase, qui héberge la
                base de données du site ; Cloudflare, qui héberge et sécurise le site. Ces
                prestataires agissent en qualité de sous-traitants et ne peuvent utiliser vos données
                qu&apos;aux fins prévues. Vos données ne sont jamais vendues ni cédées à des tiers.
              </p>
            </LegalSection>

            <LegalSection title="5. Durée de conservation">
              <ul className="space-y-3">
                <li>
                  Demandes de contact et de devis sans suite : 3 ans à compter du dernier échange.
                </li>
                <li>
                  Données des clients (coordonnées, échanges, contrat) : pendant toute la durée de la
                  prestation, puis 5 ans à compter de sa fin, durée de prescription applicable en cas
                  de litige.
                </li>
                <li>
                  Factures et pièces comptables : 10 ans, conformément à l&apos;obligation légale de
                  conservation.
                </li>
                <li>
                  Galeries privées en ligne : accessibles pendant 12 mois après leur livraison, puis
                  retirées de l&apos;espace en ligne.
                </li>
                <li>
                  Photos publiées sur le site (portfolio, galeries, événements) : jusqu&apos;au
                  retrait de l&apos;accord de la personne photographiée.
                </li>
              </ul>
              <p className="mt-4">
                À l&apos;issue de ces durées, les données sont supprimées ou anonymisées.
              </p>
            </LegalSection>

            <LegalSection title="6. Transferts hors Union européenne">
              <p>
                La base de données du site est hébergée par Supabase dans la région [RÉGION À
                COMPLÉTER]. Certains prestataires peuvent traiter des données en dehors de
                l&apos;Union européenne, notamment Cloudflare, société établie aux États-Unis. Ces
                transferts sont encadrés par les garanties prévues par le RGPD, telles que le cadre
                de protection des données UE–États-Unis ou les clauses contractuelles types de la
                Commission européenne.
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
                <a href={`mailto:${settings.email}`} className="text-foreground story-link">
                  {settings.email}
                </a>
                .
              </p>
              <p className="mt-4">
                Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés,
                vous pouvez introduire une réclamation auprès de la CNIL.
              </p>
              <p className="mt-4">
                Vous pouvez également retirer votre consentement à tout moment, sans que cela remette
                en cause les traitements déjà effectués. Nous répondons à votre demande dans un délai
                d&apos;un mois.
              </p>
            </LegalSection>

            <LegalSection title="8. Photos publiées sur le site">
              <p>
                Les photos présentées sur ce site sont publiées avec l&apos;accord des personnes
                photographiées et, pour les enfants mineurs, de leurs parents ou représentants
                légaux. Toute personne figurant sur une photo peut en demander le retrait à tout
                moment, sans avoir à se justifier, en écrivant à{" "}
                <a href={`mailto:${settings.email}`} className="text-foreground story-link">
                  {settings.email}
                </a>
                . La photo est alors retirée dans les meilleurs délais.
              </p>
            </LegalSection>

            <LegalSection title="9. Cookies et traceurs">
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

            <LegalSection title="10. Sécurité des données">
              <p>
                Soleana Studio met en œuvre des mesures techniques et organisationnelles adaptées
                pour protéger les données personnelles contre la perte, l&apos;accès non autorisé,
                la divulgation ou l&apos;altération.
              </p>
            </LegalSection>

            <LegalSection title="11. Contact">
              <p>
                Pour toute question sur cette politique ou sur l&apos;utilisation de vos données,
                vous pouvez contacter Soleana Studio :
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <strong className="text-foreground">E-mail :</strong>{" "}
                  <a href={`mailto:${settings.email}`} className="text-foreground story-link">
                    {settings.email}
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Téléphone :</strong>{" "}
                  <a href={settings.phoneHref} className="text-foreground story-link">
                    {settings.phone}
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
