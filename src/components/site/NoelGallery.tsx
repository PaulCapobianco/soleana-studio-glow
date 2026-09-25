import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NOEL_2026_PAGE_COPY, type NoelGalleryPhoto } from "@/data/noel-2026";

export function NoelGallery({ photos }: { photos: NoelGalleryPhoto[] }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const current = lightboxIndex !== null ? (photos[lightboxIndex] ?? null) : null;

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && photos.length > 1) {
        event.preventDefault();
        setLightboxIndex((i) => (i === null ? 0 : (i + 1) % photos.length));
      }
      if (event.key === "ArrowLeft" && photos.length > 1) {
        event.preventDefault();
        setLightboxIndex((i) =>
          i === null ? photos.length - 1 : (i - 1 + photos.length) % photos.length,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, photos.length]);

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:gap-5">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setLightboxIndex(index);
            }}
            className={`group relative block overflow-hidden rounded-[20px] border border-border bg-muted transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_24px_70px_-44px_rgba(62,47,40,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2 ${
              index % 5 === 0
                ? "col-span-2 aspect-[16/10] sm:col-span-1 sm:aspect-[4/5]"
                : "aspect-[4/5]"
            }`}
            aria-label={`Agrandir la photo : ${photo.alt}`}
          >
            <img
              src={photo.src}
              srcSet={`${photo.src} 700w, ${photo.srcLarge} 1600w`}
              sizes="(min-width: 1200px) 368px, (min-width: 640px) calc((100vw - 80px) / 3), 100vw"
              width={photo.width}
              height={photo.height}
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
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
                      onClick={() =>
                        setLightboxIndex(
                          lightboxIndex === null
                            ? 0
                            : (lightboxIndex - 1 + photos.length) % photos.length,
                        )
                      }
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
                      onClick={() =>
                        setLightboxIndex(
                          lightboxIndex === null ? 0 : (lightboxIndex + 1) % photos.length,
                        )
                      }
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
