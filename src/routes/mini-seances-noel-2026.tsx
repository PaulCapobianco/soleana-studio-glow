import type { CSSProperties } from "react";
import styles from "@/components/site/NoelCampaign.module.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { NoelGallery } from "@/components/site/NoelGallery";
import { absoluteUrl, buildPageSeo } from "@/lib/seo";
import { getNoel2026EditionState } from "@/lib/noel-2026.functions";
import {
  NOEL_2026_ACTIVE_HERO,
  NOEL_2026_CAMPAIGN,
  NOEL_2026_COLORS,
  NOEL_2026_FAQ,
  NOEL_2026_FORMULES,
  NOEL_2026_GALLERY_PHOTOS,
  NOEL_2026_LOCATION,
  NOEL_2026_SESSION_DATES,
  NOEL_2026_TEXTS,
  NOEL_2026_SEO,
  NOEL_2026_PAGE_COPY,
} from "@/data/noel-2026";

export const Route = createFileRoute("/mini-seances-noel-2026")({
  loader: () => getNoel2026EditionState(),
  head: () => {
    const seo = buildPageSeo(NOEL_2026_SEO);

    return {
      ...seo,
      meta: [
        ...seo.meta,
        { property: "og:image", content: absoluteUrl(NOEL_2026_ACTIVE_HERO.src1600) },
      ],
    };
  },
  component: NoelPage,
});

function NoelPage() {
  const { isEditionOver } = Route.useLoaderData();

  if (isEditionOver) {
    return (
      <SiteShell>
        <section className="px-6 pt-40 pb-32 text-center">
          <Reveal>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.4em] mb-4"
              style={{ color: NOEL_2026_COLORS.deepRed }}
            >
              {NOEL_2026_PAGE_COPY.editionStatus}
            </p>
            <h1 className="font-display text-4xl md:text-5xl italic text-primary mb-6">
              {NOEL_2026_TEXTS.heroTitle}
            </h1>
            <p className="mb-4 text-lg">{NOEL_2026_TEXTS.editionOverTitle}</p>
            <p className="max-w-xl mx-auto text-foreground/90 text-lg leading-relaxed mb-10">
              {NOEL_2026_TEXTS.editionOverText}
            </p>
            <Link
              to="/prestations"
              className="inline-flex items-center justify-center px-8 py-3 text-xs uppercase tracking-widest text-white transition-colors"
              style={{ backgroundColor: NOEL_2026_COLORS.pineGreen }}
            >
              {NOEL_2026_TEXTS.editionOverButton}
            </Link>
          </Reveal>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div
        className={styles.campaign}
        style={
          {
            "--noel-pine": NOEL_2026_COLORS.pineGreen,
            "--noel-red": NOEL_2026_COLORS.deepRed,
          } as CSSProperties
        }
      >
        <section className={styles.landingHero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <img
              className={styles.heroPhoto}
              src={NOEL_2026_ACTIVE_HERO.src}
              srcSet={`${NOEL_2026_ACTIVE_HERO.src} 800w, ${NOEL_2026_ACTIVE_HERO.src1600} 1600w, ${NOEL_2026_ACTIVE_HERO.src2400} 2400w`}
              sizes="(min-width: 1024px) 65vw, 100vw"
              alt={NOEL_2026_ACTIVE_HERO.alt}
              width={2400}
              height={1600}
              fetchPriority="high"
              decoding="async"
              style={{ objectPosition: NOEL_2026_ACTIVE_HERO.objectPosition }}
            />
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{NOEL_2026_CAMPAIGN.editionLabel} · Soleana Studio</p>
              <h1 className={`${styles.display} ${styles.heroTitle}`}>
                {NOEL_2026_TEXTS.heroTitle}
              </h1>
              <p className={styles.heroSubtitle}>{NOEL_2026_TEXTS.heroSubtitle}</p>
              <p className={styles.heroDates}>
                {NOEL_2026_TEXTS.heroDatesLabel}
                <br />
                {NOEL_2026_LOCATION}
              </p>
              <a href="#formules" className={styles.editorialLink}>
                {NOEL_2026_TEXTS.heroCta}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.intro}`}>
            {NOEL_2026_TEXTS.experience.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className={styles.gallerySection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {NOEL_2026_PAGE_COPY.galleryTitle}
              </h2>
              <p>{NOEL_2026_TEXTS.galleryMention}</p>
            </div>
            <NoelGallery photos={NOEL_2026_GALLERY_PHOTOS} />
          </div>
        </section>

        <section className={styles.experience}>
          <img
            src={NOEL_2026_GALLERY_PHOTOS[3].src}
            srcSet={`${NOEL_2026_GALLERY_PHOTOS[3].src} 700w, ${NOEL_2026_GALLERY_PHOTOS[3].srcLarge} 1600w`}
            sizes="(min-width: 768px) 90vw, 100vw"
            width={700}
            height={467}
            alt={NOEL_2026_GALLERY_PHOTOS[3].alt}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.experienceCopy}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_PAGE_COPY.experienceTitle}
            </h2>
            <ol>
              {NOEL_2026_PAGE_COPY.experienceItems.map((item, index) => (
                <li key={item}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_PAGE_COPY.datesTitle}
            </h2>
            <div className={styles.dates}>
              {NOEL_2026_SESSION_DATES.map((date) => (
                <div key={date.iso}>
                  <span aria-hidden="true">{date.iso.slice(-2)}</span>
                  <time dateTime={date.iso}>{date.label}</time>
                </div>
              ))}
            </div>
            <p className={styles.note}>{NOEL_2026_PAGE_COPY.limitedPlaces}</p>
          </div>
        </section>

        <section id="formules" className={`${styles.section} ${styles.formulesSection}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {NOEL_2026_PAGE_COPY.formulesTitle}
              </h2>
              <p>{NOEL_2026_PAGE_COPY.formulesIntro}</p>
            </div>
            <div className={styles.formules}>
              {NOEL_2026_FORMULES.map((formule, index) => (
                <article key={formule.id}>
                  <p className={styles.eyebrow} aria-hidden="true">
                    0{index + 1}
                  </p>
                  <h3 className={styles.formuleName}>{formule.name}</h3>
                  <p className={styles.price}>
                    {formule.priceEur} <span>€</span>
                  </p>
                  <ul>
                    {formule.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <a
                    href={formule.pelliUrl}
                    target="_blank"
                    rel="noopener"
                    className={styles.editorialLink}
                  >
                    {NOEL_2026_PAGE_COPY.formuleCta}
                    <span aria-hidden="true">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.faq}`}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_PAGE_COPY.faqTitle}
            </h2>
            <div>
              {NOEL_2026_FAQ.map((item) => (
                <div className={styles.faqItem} key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.closing}>
          <img
            src={NOEL_2026_CAMPAIGN.closingPhoto.src}
            srcSet={`${NOEL_2026_CAMPAIGN.closingPhoto.src} 700w, ${NOEL_2026_CAMPAIGN.closingPhoto.srcLarge} 1600w`}
            sizes="(min-width: 768px) 55vw, 100vw"
            width={700}
            height={1050}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className={styles.eyebrow}>{NOEL_2026_CAMPAIGN.editionLabel}</p>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_TEXTS.ctaFinalTitle}
            </h2>
            <p className={styles.closingPhrase}>{NOEL_2026_TEXTS.heroSubtitle}</p>
            <a href="#formules" className={styles.editorialLink}>
              {NOEL_2026_TEXTS.ctaFinalButton}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
