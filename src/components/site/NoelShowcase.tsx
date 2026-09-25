import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  NOEL_2026_CAMPAIGN,
  NOEL_2026_COLORS,
  NOEL_2026_LOCATION,
  NOEL_2026_TEASER,
} from "@/data/noel-2026";
import styles from "./NoelCampaign.module.css";

export function NoelShowcase() {
  const photo = NOEL_2026_TEASER.photo;
  const detail = NOEL_2026_CAMPAIGN.detailPhoto;

  return (
    <section
      aria-labelledby="noel-teaser-title"
      className={`${styles.campaign} ${styles.showcase}`}
      style={
        {
          "--noel-pine": NOEL_2026_COLORS.pineGreen,
          "--noel-red": NOEL_2026_COLORS.deepRed,
        } as CSSProperties
      }
    >
      <div className={styles.container}>
        <div className={styles.showcaseHeader}>
          <div>
            <p className={styles.eyebrow} style={{ color: NOEL_2026_COLORS.deepRed }}>
              {NOEL_2026_CAMPAIGN.editionLabel}
            </p>
            <h2 id="noel-teaser-title" className={`${styles.display} ${styles.showcaseTitle}`}>
              {NOEL_2026_TEASER.title}
            </h2>
          </div>
          <div>
            <p className={styles.showcaseDates}>{NOEL_2026_TEASER.datesLabel}</p>
            <p className={styles.showcaseLocation}>{NOEL_2026_LOCATION}</p>
          </div>
        </div>
        <div className={styles.showcaseStage}>
          <div className={styles.showcaseMain}>
            <img
              src={photo.src}
              srcSet={`${photo.src} 800w, ${photo.src1600} 1600w`}
              sizes="(min-width: 1408px) 1067px, (min-width: 1024px) 76vw, (min-width: 640px) 75vw, calc(100vw - 40px)"
              alt={photo.alt}
              width={1600}
              height={1067}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className={styles.showcaseDetail}>
            <img
              src={detail.src}
              alt={detail.alt}
              width={detail.width}
              height={detail.height}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className={styles.showcaseBottom}>
          <p className={styles.showcaseText}>{NOEL_2026_TEASER.text}</p>
          <Link to="/mini-seances-noel-2026" className={styles.button}>
            {NOEL_2026_TEASER.cta}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
