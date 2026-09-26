import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  NOEL_2026_CAMPAIGN,
  NOEL_2026_COLORS,
  NOEL_2026_LOCATION,
  NOEL_2026_TEASER,
} from "@/data/noel-2026";
import { Reveal } from "./Reveal";
import { NoelStar } from "./NoelStar";
import styles from "./NoelCampaign.module.css";

export function NoelShowcase() {
  const photo = NOEL_2026_TEASER.photo;

  return (
    <section
      aria-labelledby="noel-teaser-title"
      className={`${styles.campaign} ${styles.teaser}`}
      style={
        {
          "--noel-burgundy": NOEL_2026_COLORS.burgundy,
        } as CSSProperties
      }
    >
      <div className={styles.teaserGrid}>
        <Reveal className={styles.teaserPhotoWrap}>
          <img
            className={styles.teaserPhoto}
            src={photo.src}
            srcSet={`${photo.src} 800w, ${photo.src1600} 1600w`}
            sizes="(min-width: 1024px) 58vw, 100vw"
            alt={photo.alt}
            width={1600}
            height={1067}
            loading="lazy"
            decoding="async"
          />
        </Reveal>
        <Reveal className={styles.teaserCard} delay={150}>
          <NoelStar className={styles.star} />
          <p className={`${styles.eyebrow} ${styles.accentRed}`}>
            {NOEL_2026_CAMPAIGN.editionLabel}
          </p>
          <h2 id="noel-teaser-title" className={`${styles.display} ${styles.teaserTitle}`}>
            {NOEL_2026_TEASER.title}
          </h2>
          <p className={styles.teaserDates}>{NOEL_2026_TEASER.datesLabel}</p>
          <p className={styles.teaserLocation}>{NOEL_2026_LOCATION}</p>
          <p className={styles.teaserText}>{NOEL_2026_TEASER.text}</p>
          <Link to="/mini-seances-noel-2026" className={styles.button}>
            {NOEL_2026_TEASER.cta}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
