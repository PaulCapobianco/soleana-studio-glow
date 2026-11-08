import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { EventTeaserData } from "@/lib/events/types";
import { eventAssets } from "./event-assets";
import { Reveal } from "./Reveal";
import { EventIcon } from "./EventIcon";
import styles from "./NoelCampaign.module.css";

/** Invitation de l'accueil vers la page d'un événement (remplace NoelShowcase). */
export function EventTeaser({ teaser }: { teaser: EventTeaserData }) {
  const assets = eventAssets(teaser.slug);
  const image = assets
    ? {
        src: assets.teaser.src,
        srcSet: `${assets.teaser.src} 800w, ${assets.teaser.src1600} 1600w`,
        alt: assets.teaser.alt,
      }
    : teaser.imageUrl
      ? {
          src: teaser.imageSmallUrl ?? teaser.imageUrl,
          srcSet: `${teaser.imageSmallUrl ?? teaser.imageUrl} 800w, ${teaser.imageUrl} 1600w`,
          alt: teaser.imageAlt,
        }
      : null;

  return (
    <section
      aria-labelledby="event-teaser-title"
      className={`${styles.campaign} ${styles.teaser}`}
      style={teaser.appearance.vars as CSSProperties}
    >
      <div className={styles.teaserGrid}>
        {image && (
          <Reveal className={styles.teaserPhotoWrap}>
            <img
              className={styles.teaserPhoto}
              src={image.src}
              srcSet={image.srcSet}
              sizes="(min-width: 1024px) 58vw, 100vw"
              alt={image.alt}
              width={1600}
              height={1067}
              loading="lazy"
              decoding="async"
            />
          </Reveal>
        )}
        <Reveal className={styles.teaserCard} delay={150}>
          <EventIcon node={teaser.appearance.iconMain} className={styles.star} />
          <p className={`${styles.eyebrow} ${styles.accentRed}`}>{teaser.editionLabel}</p>
          <h2 id="event-teaser-title" className={`${styles.display} ${styles.teaserTitle}`}>
            {teaser.title}
          </h2>
          {teaser.datesLabel && <p className={styles.teaserDates}>{teaser.datesLabel}</p>}
          {teaser.location && <p className={styles.teaserLocation}>{teaser.location}</p>}
          {teaser.text && <p className={styles.teaserText}>{teaser.text}</p>}
          <Link to="/$slug" params={{ slug: teaser.slug }} className={styles.button}>
            {teaser.cta}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
