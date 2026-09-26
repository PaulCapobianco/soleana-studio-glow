import type { CSSProperties } from "react";
import styles from "@/components/site/NoelCampaign.module.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { NoelGallery } from "@/components/site/NoelGallery";
import { NoelStar } from "@/components/site/NoelStar";
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
              <NoelStar className={styles.star} />
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

  const main = NOEL_2026_GALLERY_PHOTOS[0];
  const accent = NOEL_2026_GALLERY_PHOTOS[5];

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
            <p className={`${styles.eyebrow} ${styles.onDark}`}>
              {NOEL_2026_CAMPAIGN.editionLabel} · Soleana Studio
            </p>
            <h1 className={`${styles.display} ${styles.heroTitle}`}>{NOEL_2026_TEXTS.heroTitle}</h1>
            <p className={styles.heroSubtitle}>{NOEL_2026_TEXTS.heroSubtitle}</p>
            <ul className={styles.tags}>
              <li>{NOEL_2026_TEXTS.heroDatesLabel}</li>
              <li>{NOEL_2026_LOCATION}</li>
            </ul>
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              {NOEL_2026_TEXTS.heroCta}
            </a>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.intro}`}>
            <Reveal className={styles.introCopy}>
              <p className={`${styles.eyebrow} ${styles.accentRed}`}>L'expérience</p>
              <p className={styles.lead}>{NOEL_2026_TEXTS.experience[0]}</p>
              <p className={styles.audience}>{NOEL_2026_TEXTS.experience[1]}</p>
              <p className={styles.small}>{NOEL_2026_TEXTS.experience[2]}</p>
            </Reveal>
            <div className={styles.introPhotos}>
              <img
                className={styles.introMain}
                src={main.src}
                srcSet={`${main.src} 700w, ${main.srcLarge} 1600w`}
                sizes="(min-width: 1024px) 34vw, (min-width: 768px) 45vw, 100vw"
                width={main.width}
                height={main.height}
                alt={main.alt}
                loading="lazy"
                decoding="async"
              />
              <img
                className={styles.introAccent}
                src={accent.src}
                srcSet={`${accent.src} 700w, ${accent.srcLarge} 1600w`}
                sizes="16vw"
                width={accent.width}
                height={accent.height}
                alt={accent.alt}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.stepsSection}`}>
          <div className={styles.container}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_PAGE_COPY.experienceTitle}
            </h2>
            <ol className={styles.steps}>
              {NOEL_2026_PAGE_COPY.experienceItems.map((item, index) => (
                <li key={item}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
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

        <section id="formules" className={`${styles.section} ${styles.night}`}>
          <div className={styles.container}>
            <div className={styles.formulesHead}>
              <NoelStar className={styles.star} />
              <p className={`${styles.eyebrow} ${styles.onDark}`}>
                {NOEL_2026_CAMPAIGN.editionLabel}
              </p>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {NOEL_2026_PAGE_COPY.formulesTitle}
              </h2>
              <p className={styles.formulesIntro}>{NOEL_2026_PAGE_COPY.formulesIntro}</p>
            </div>
            <div className={styles.datesBar}>
              <h3 className={`${styles.eyebrow} ${styles.onDark}`}>
                {NOEL_2026_PAGE_COPY.datesTitle}
              </h3>
              <ul>
                {NOEL_2026_SESSION_DATES.map((date) => (
                  <li key={date.iso}>
                    <time dateTime={date.iso}>{date.label}</time>
                  </li>
                ))}
              </ul>
              <p>{NOEL_2026_PAGE_COPY.limitedPlaces}</p>
            </div>
            <Reveal className={styles.formules}>
              {NOEL_2026_FORMULES.map((formule, index) => (
                <article key={formule.id} className={index === 1 ? styles.featured : undefined}>
                  {index === 1 && <span className={styles.badge}>La plus complète</span>}
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
            </Reveal>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.faq}`}>
            <div>
              <p className={`${styles.eyebrow} ${styles.accentRed}`}>En pratique</p>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {NOEL_2026_PAGE_COPY.faqTitle}
              </h2>
            </div>
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

        <section className={`${styles.closing} ${styles.night}`}>
          <Reveal className={styles.closingCopy}>
            <NoelStar className={styles.star} />
            <p className={`${styles.eyebrow} ${styles.onDark}`}>
              {NOEL_2026_CAMPAIGN.editionLabel}
            </p>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              {NOEL_2026_TEXTS.ctaFinalTitle}
            </h2>
            <p className={styles.closingPhrase}>{NOEL_2026_TEXTS.heroSubtitle}</p>
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              {NOEL_2026_TEXTS.ctaFinalButton}
            </a>
          </Reveal>
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
