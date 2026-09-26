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

const seasonVars = {
  "--noel-pine": NOEL_2026_COLORS.pineGreen,
  "--noel-red": NOEL_2026_COLORS.deepRed,
} as CSSProperties;

function NoelPage() {
  const { isEditionOver } = Route.useLoaderData();

  if (isEditionOver) {
    return (
      <SiteShell>
        <div className={styles.campaign} style={seasonVars}>
          <section className={styles.over}>
            <Reveal>
              <p className={`${styles.eyebrow} ${styles.accentRed}`}>
                {NOEL_2026_PAGE_COPY.editionStatus}
              </p>
              <h1 className={`${styles.display} ${styles.overTitle}`}>
                {NOEL_2026_TEXTS.heroTitle}
              </h1>
              <p className={styles.overLead}>{NOEL_2026_TEXTS.editionOverTitle}</p>
              <p className={styles.overText}>{NOEL_2026_TEXTS.editionOverText}</p>
              <Link to="/prestations" className={styles.button}>
                {NOEL_2026_TEXTS.editionOverButton}
              </Link>
            </Reveal>
          </section>
        </div>
      </SiteShell>
    );
  }

  const experiencePhoto = NOEL_2026_GALLERY_PHOTOS[0];

  return (
    <SiteShell overlay>
      <div className={styles.campaign} style={seasonVars}>
        <section className={styles.landingHero}>
          <img
            className={styles.heroPhoto}
            src={NOEL_2026_ACTIVE_HERO.src}
            srcSet={`${NOEL_2026_ACTIVE_HERO.src} 800w, ${NOEL_2026_ACTIVE_HERO.src1600} 1600w, ${NOEL_2026_ACTIVE_HERO.src2400} 2400w`}
            sizes="100vw"
            alt={NOEL_2026_ACTIVE_HERO.alt}
            width={2400}
            height={1600}
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{NOEL_2026_CAMPAIGN.editionLabel} · Soleana Studio</p>
            <h1 className={`${styles.display} ${styles.heroTitle}`}>{NOEL_2026_TEXTS.heroTitle}</h1>
            <p className={styles.heroSubtitle}>{NOEL_2026_TEXTS.heroSubtitle}</p>
            <p className={styles.heroDates}>
              {NOEL_2026_TEXTS.heroDatesLabel}
              <br />
              {NOEL_2026_LOCATION}
            </p>
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              {NOEL_2026_TEXTS.heroCta}
            </a>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.intro}`}>
            <div className={styles.introCopy}>
              {NOEL_2026_TEXTS.experience.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <img
              className={styles.introPhoto}
              src={experiencePhoto.src}
              srcSet={`${experiencePhoto.src} 700w, ${experiencePhoto.srcLarge} 1600w`}
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 45vw, 100vw"
              width={experiencePhoto.width}
              height={experiencePhoto.height}
              alt={experiencePhoto.alt}
              loading="lazy"
              decoding="async"
            />
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

        <section className={`${styles.section} ${styles.tinted}`}>
          <div className={`${styles.container} ${styles.steps}`}>
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
          <div className={`${styles.container} ${styles.datesBlock}`}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_PAGE_COPY.datesTitle}
            </h2>
            <div>
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
          </div>
        </section>

        <section
          id="formules"
          className={`${styles.section} ${styles.tinted} ${styles.formulesSection}`}
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {NOEL_2026_PAGE_COPY.formulesTitle}
              </h2>
              <p>{NOEL_2026_PAGE_COPY.formulesIntro}</p>
            </div>
            <div className={styles.formules}>
              {NOEL_2026_FORMULES.map((formule, index) => (
                <article key={formule.id} className={index === 1 ? styles.featured : undefined}>
                  <p className={`${styles.eyebrow} ${styles.accentRed}`} aria-hidden="true">
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
                    className={styles.button}
                  >
                    {NOEL_2026_PAGE_COPY.formuleCta}
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
                <details className={styles.faqItem} key={item.question}>
                  <summary>
                    <h3>{item.question}</h3>
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingCopy}>
            <p className={styles.eyebrow}>{NOEL_2026_CAMPAIGN.editionLabel}</p>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_TEXTS.ctaFinalTitle}
            </h2>
            <p className={styles.closingPhrase}>{NOEL_2026_TEXTS.heroSubtitle}</p>
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              {NOEL_2026_TEXTS.ctaFinalButton}
            </a>
          </div>
          <img
            src={NOEL_2026_CAMPAIGN.closingPhoto.src}
            srcSet={`${NOEL_2026_CAMPAIGN.closingPhoto.src} 700w, ${NOEL_2026_CAMPAIGN.closingPhoto.srcLarge} 1600w`}
            sizes="(min-width: 768px) 50vw, 100vw"
            width={700}
            height={1050}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </section>
      </div>
    </SiteShell>
  );
}
