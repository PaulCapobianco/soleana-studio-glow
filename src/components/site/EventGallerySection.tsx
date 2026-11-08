import { Link } from "@tanstack/react-router";
import styles from "@/components/site/NoelCampaign.module.css";
import { NoelGallery, type GallerySession } from "@/components/site/NoelGallery";
import type { EventGalleryGroup } from "@/lib/events/galleries";

/** Galeries lues depuis Storage : une vignette par galerie (couverture + nombre), lightbox au clic. */
export function EventGallerySection({ groups }: { groups: EventGalleryGroup[] }) {
  return (
    <>
      {groups.map((group, index) => {
        const sessions: GallerySession[] = group.galleries.map((gallery) => {
          const photos = gallery.photos.map((photo) => ({
            id: photo.id,
            src: photo.image_url,
            srcLarge: photo.image_url,
            width: photo.width,
            height: photo.height,
            alt: photo.alt_text,
            webpSrcSet: photo.webp_srcset,
            avifSrcSet: photo.avif_srcset,
          }));
          return { id: gallery.slot, title: gallery.title, cover: photos[0], photos };
        });
        const heading = group.previousEdition
          ? `Édition précédente : ${group.previousEdition.title}`
          : "Galerie photos";
        return (
          <section
            key={group.previousEdition?.slug ?? `own-${index}`}
            className={styles.gallerySection}
          >
            <div className={styles.container}>
              <div className={styles.sectionHeading}>
                <h2 className={`${styles.display} ${styles.sectionTitle}`}>{heading}</h2>
                {group.previousEdition && (
                  <p>
                    <Link to="/$slug" params={{ slug: group.previousEdition.slug }}>
                      Voir cet événement
                    </Link>
                  </p>
                )}
              </div>
              <NoelGallery sessions={sessions} dialogTitle={heading} />
            </div>
          </section>
        );
      })}
    </>
  );
}
