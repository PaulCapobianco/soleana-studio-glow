import styles from "@/components/site/NoelCampaign.module.css";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NOEL_2026_PAGE_COPY } from "@/data/noel-2026";
import type { NoelSession } from "@/data/noel-2026-sessions";

// Une tuile par séance (couverture + nombre de photos) ; un clic ouvre la lightbox sur les
// photos de cette séance seulement.
export function NoelGallery({ sessions }: { sessions: NoelSession[] }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<{ session: number; index: number } | null>(null);
  const photos = open ? sessions[open.session].photos : [];
  const lightboxIndex = open ? open.index : null;
  const current = open ? (photos[open.index] ?? null) : null;

  function go(delta: number) {
    setOpen((state) =>
      state
        ? {
            session: state.session,
            index:
              (state.index + delta + sessions[state.session].photos.length) %
              sessions[state.session].photos.length,
          }
        : state,
    );
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.session]);

  useEffect(() => {
    if (lightboxIndex === null) {
      delete document.body.dataset.galleryOpen;
      return;
    }
    document.body.dataset.galleryOpen = "true";
    return () => {
      delete document.body.dataset.galleryOpen;
    };
  }, [lightboxIndex]);

  return (
    <>
      <div className={styles.gallery}>
        {sessions.map((session, sessionIndex) => (
          <button
            key={session.id}
            type="button"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setOpen({ session: sessionIndex, index: 0 });
            }}
            className={styles.galleryPhoto}
            aria-label={`Ouvrir la série de ${session.photos.length} photos : ${session.cover.alt}`}
          >
            <img
              src={session.cover.src}
              srcSet={`${session.cover.src} 700w, ${session.cover.srcLarge} 1600w`}
              sizes="(min-width: 1440px) 700px, (min-width: 768px) 55vw, 100vw"
              width={session.cover.width}
              height={session.cover.height}
              alt={session.cover.alt}
              loading="lazy"
              decoding="async"
              className={styles.galleryImage}
            />
            <span className={styles.photoCount} aria-hidden="true">
              {session.photos.length} photos
            </span>
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="!left-0 !top-0 !h-[100svh] !w-[100svw] !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-black/95 !p-0 !shadow-none !overflow-hidden"
        >
          <DialogTitle className="sr-only">{NOEL_2026_PAGE_COPY.galleryTitle}</DialogTitle>
          <DialogDescription className="sr-only">{current?.alt}</DialogDescription>
          {current && (
            <div className="flex h-[100svh] w-full flex-col text-white">
              <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
                <img
                  src={current.srcLarge}
                  alt={current.alt}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="block max-h-[calc(100svh-6rem)] max-w-[min(96vw,1400px)] rounded-[18px] object-contain shadow-2xl"
                />
              </div>

              {photos.length > 1 && (
                <div className="border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6 md:px-6 md:pb-8 md:pt-3">
                  <div className="flex items-center justify-between gap-3 md:justify-center md:gap-4">
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      aria-label="Photo précédente"
                    >
                      Précédente
                    </button>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/55">
                      {(lightboxIndex ?? 0) + 1}/{photos.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      aria-label="Photo suivante"
                    >
                      Suivante
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
