import styles from "@/components/site/NoelCampaign.module.css";
import { NoelGallery } from "@/components/site/NoelGallery";
import { NOEL_2026_SESSIONS } from "@/data/noel-2026-sessions";

// Chargé à la demande (React.lazy dans EventPage) : les 74 photos de l'édition Noël 2026 ne
// pèsent pas sur les autres pages qui passent par la même route.
export default function NoelGallerySection({ title, caption }: { title: string; caption: string }) {
  return (
    <section className={styles.gallerySection}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <h2 className={`${styles.display} ${styles.sectionTitle}`}>{title}</h2>
          <p>{caption}</p>
        </div>
        <NoelGallery sessions={NOEL_2026_SESSIONS} />
      </div>
    </section>
  );
}
