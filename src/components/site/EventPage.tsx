import { lazy, Suspense, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import styles from "@/components/site/NoelCampaign.module.css";
import { Reveal } from "@/components/site/Reveal";
import { NoelStar } from "@/components/site/NoelStar";
import { SiteShell } from "@/components/site/SiteShell";
import { eventAssets } from "@/components/site/event-assets";
import { NOEL_2026_COLORS } from "@/data/noel-2026";
import { formatFallbackSentence, formatHeroDates, formatLongDate } from "@/lib/events/dates";
import type { EventContent } from "@/lib/events/types";

const NoelGallerySection = lazy(() => import("@/components/site/NoelGallerySection"));

const seasonVars = { "--noel-burgundy": NOEL_2026_COLORS.burgundy } as CSSProperties;

type Props = { event: EventContent; isOver: boolean };

/** Page publique d'un événement, dans la mise en page du site. */
export function EventPage({ event, isOver }: Props) {
  return (
    <SiteShell overlay={!isOver}>
      <EventPageContent event={event} isOver={isOver} />
    </SiteShell>
  );
}

/** Contenu seul (sans menu ni pied de page) : réutilisé par l'aperçu de l'administration. */
export function EventPageContent({ event, isOver }: Props) {
  const assets = eventAssets(event.slug);
  const eyebrow = event.edition_label.trim() || "Soleana Studio";
  const paragraphs = event.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (isOver) {
    return (
      <div className={styles.campaign} style={seasonVars}>
        <section className={styles.over}>
          <Reveal>
            <NoelStar className={styles.star} />
            <p className={`${styles.eyebrow} ${styles.accentRed}`}>Édition terminée</p>
            <h1 className={`${styles.display} ${styles.overTitle}`}>{event.title}</h1>
            {event.ended_title.trim() && <p className={styles.overLead}>{event.ended_title}</p>}
            {event.ended_text.trim() && <p className={styles.overText}>{event.ended_text}</p>}
            <Link to="/prestations" className={styles.button}>
              Découvrir mes prestations
            </Link>
          </Reveal>
        </section>
      </div>
    );
  }

  const heroSrc = assets?.hero.src ?? event.cover_image_small_url ?? event.cover_image_url;
  const heroSrcSet = assets
    ? `${assets.hero.src} 800w, ${assets.hero.src1600} 1600w, ${assets.hero.src2400} 2400w`
    : event.cover_image_url
      ? `${event.cover_image_small_url ?? event.cover_image_url} 800w, ${event.cover_image_url} 1600w`
      : undefined;
  const heroAlt = assets?.hero.alt ?? event.cover_image_alt;
  const fallbackSentence = formatFallbackSentence(event.fallback_dates);
  const sortedDates = [...event.event_dates].sort();
  const hasFormules = event.formules.length > 0;
  const bookingUrl = event.booking_url?.trim() || null;

  return (
    <div className={styles.campaign} style={seasonVars}>
      <section className={styles.landingHero}>
        {heroSrc && (
          <img
            className={styles.heroPhoto}
            src={heroSrc}
            srcSet={heroSrcSet}
            sizes="100vw"
            alt={heroAlt}
            width={2400}
            height={1600}
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className={styles.heroCopy}>
          <p className={`${styles.eyebrow} ${styles.onDark}`}>{eyebrow} · Soleana Studio</p>
          <h1 className={`${styles.display} ${styles.heroTitle}`}>{event.title}</h1>
          {event.subtitle.trim() && <p className={styles.heroSubtitle}>{event.subtitle}</p>}
          <ul className={styles.tags}>
            {sortedDates.length > 0 && <li>{formatHeroDates(sortedDates)}</li>}
            {event.location.trim() && <li>{event.location}</li>}
          </ul>
          {(hasFormules || bookingUrl) && (
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              Réserver ma séance
            </a>
          )}
        </div>
      </section>

      {paragraphs.length > 0 && (
        <section className={styles.section}>
          <div className={`${styles.container} ${styles.intro}`}>
            <Reveal className={`${styles.introCopy} ${assets ? "" : styles.introSolo}`}>
              <p className={`${styles.eyebrow} ${styles.accentRed}`}>L'expérience</p>
              <p className={styles.lead}>{paragraphs[0]}</p>
              {paragraphs[1] && <p className={styles.audience}>{paragraphs[1]}</p>}
              {paragraphs.slice(2).map((text) => (
                <p key={text} className={styles.small}>
                  {text}
                </p>
              ))}
            </Reveal>
            {assets && (
              <div className={styles.introPhotos}>
                <img
                  className={styles.introMain}
                  src={assets.intro.src}
                  srcSet={`${assets.intro.src} 700w, ${assets.intro.srcLarge} 1600w`}
                  sizes="(min-width: 1024px) 34vw, (min-width: 768px) 45vw, 100vw"
                  width={assets.intro.width}
                  height={assets.intro.height}
                  alt={assets.intro.alt}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  className={styles.introAccent}
                  src={assets.accent.src}
                  srcSet={`${assets.accent.src} 700w, ${assets.accent.srcLarge} 1600w`}
                  sizes="16vw"
                  width={assets.accent.width}
                  height={assets.accent.height}
                  alt={assets.accent.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {event.experience_steps.length > 0 && (
        <section className={`${styles.section} ${styles.stepsSection}`}>
          <div className={styles.container}>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>
              Le déroulement de la séance
            </h2>
            <ol className={styles.steps}>
              {event.experience_steps.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {assets?.hasGallery && (
        <Suspense fallback={null}>
          <NoelGallerySection title={assets.galleryTitle} caption={assets.galleryCaption} />
        </Suspense>
      )}

      {(hasFormules || bookingUrl || sortedDates.length > 0) && (
        <section id="formules" className={`${styles.section} ${styles.night}`}>
          <div className={styles.container}>
            <div className={styles.formulesHead}>
              <NoelStar className={styles.star} />
              <p className={`${styles.eyebrow} ${styles.onDark}`}>{eyebrow}</p>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>
                {hasFormules ? "Les formules" : "Réserver"}
              </h2>
              {event.formules.length > 1 && (
                <p className={styles.formulesIntro}>
                  Réservation via les liens dédiés — un lien par formule.
                </p>
              )}
            </div>
            {sortedDates.length > 0 && (
              <div className={styles.datesBar}>
                <h3 className={`${styles.eyebrow} ${styles.onDark}`}>Les dates</h3>
                <ul>
                  {sortedDates.map((date) => (
                    <li key={date}>
                      <time dateTime={date}>{formatLongDate(date)}</time>
                    </li>
                  ))}
                </ul>
                {event.availability_note.trim() && <p>{event.availability_note}</p>}
                {fallbackSentence && <p>{fallbackSentence}</p>}
              </div>
            )}
            {hasFormules ? (
              <Reveal className={styles.formules}>
                {event.formules.map((formule, index) => (
                  <article
                    key={`${index}-${formule.name}`}
                    className={formule.featured ? styles.featured : undefined}
                  >
                    {formule.featured && <span className={styles.badge}>La plus complète</span>}
                    <p className={`${styles.eyebrow} ${styles.accentRed}`} aria-hidden="true">
                      0{index + 1}
                    </p>
                    <h3 className={styles.formuleName}>{formule.name}</h3>
                    <p className={styles.price}>
                      {formule.price_eur} <span>€</span>
                    </p>
                    <ul>
                      {formule.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    {formule.booking_url && (
                      <a
                        href={formule.booking_url}
                        target="_blank"
                        rel="noopener"
                        className={styles.button}
                      >
                        Réserver cette formule
                      </a>
                    )}
                  </article>
                ))}
              </Reveal>
            ) : (
              bookingUrl && (
                <p>
                  <a href={bookingUrl} target="_blank" rel="noopener" className={styles.button}>
                    Réserver ma séance
                  </a>
                </p>
              )
            )}
          </div>
        </section>
      )}

      {event.faq.length > 0 && (
        <section className={styles.section}>
          <div className={`${styles.container} ${styles.faq}`}>
            <div>
              <p className={`${styles.eyebrow} ${styles.accentRed}`}>En pratique</p>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>Questions fréquentes</h2>
            </div>
            <div>
              {event.faq.map((item) => (
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
      )}

      {(hasFormules || bookingUrl) && event.closing_title.trim() && (
        <section className={`${styles.closing} ${styles.night}`}>
          <Reveal className={styles.closingCopy}>
            <NoelStar className={styles.star} />
            <p className={`${styles.eyebrow} ${styles.onDark}`}>{eyebrow}</p>
            <h2 className={`${styles.display} ${styles.sectionTitle}`}>{event.closing_title}</h2>
            {event.subtitle.trim() && <p className={styles.closingPhrase}>{event.subtitle}</p>}
            <a href="#formules" className={`${styles.button} ${styles.buttonLight}`}>
              Réserver ma séance
            </a>
          </Reveal>
          {assets && (
            <img
              src={assets.closing.src}
              srcSet={`${assets.closing.src} 700w, ${assets.closing.srcLarge} 1600w`}
              sizes="(min-width: 768px) 50vw, 100vw"
              width={700}
              height={1050}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
        </section>
      )}
    </div>
  );
}
