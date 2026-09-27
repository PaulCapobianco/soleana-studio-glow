import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type GalleryPhoto = {
  id: string;
  image_url: string;
  alt_text: string;
  location: string | null;
  title: string | null;
  display_order: number;
  /** Présents seulement pour les photos Storage (variantes 400/800/1200/1600 ou largeur native). */
  srcset?: string;
  avif_srcset?: string;
  webp_srcset?: string;
  object_position?: string;
};

// Tailles d'affichage par contexte (utilisées seulement quand la photo a un srcset).
const SIZES_LARGE = "(min-width: 1024px) 960px, 100vw";
const SIZES_TILE = "(min-width: 1024px) 300px, 45vw";

function GalleryImage({
  photo,
  sizes,
  width,
  height,
  className,
}: {
  photo: GalleryPhoto;
  sizes: string;
  width: number;
  height: number;
  className: string;
}) {
  const image = (
    <img
      src={photo.image_url}
      srcSet={photo.srcset}
      sizes={photo.srcset ? sizes : undefined}
      style={photo.object_position ? { objectPosition: photo.object_position } : undefined}
      alt={photo.alt_text}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={className}
    />
  );
  if (!photo.avif_srcset || !photo.webp_srcset) return image;
  return (
    <picture>
      <source type="image/avif" srcSet={photo.avif_srcset} sizes={sizes} />
      <source type="image/webp" srcSet={photo.webp_srcset} sizes={sizes} />
      {image}
    </picture>
  );
}

type CategoryGallerySectionProps = {
  categorySlugs: string[];
  subtitle: string;
  title: string;
  description?: string;
  showHeader?: boolean;
  variant?: "standard" | "single";
  photos?: GalleryPhoto[];
  fallbackImageSrc?: string;
  fallbackImageAlt?: string;
  viewAllLink?: string;
  viewAllLabel?: string;
  compact?: boolean;
  id?: string;
};

export function CategoryGallerySection({
  categorySlugs,
  subtitle,
  title,
  description,
  showHeader = true,
  variant = "standard",
  photos: manualPhotos,
  fallbackImageSrc,
  fallbackImageAlt,
  viewAllLink,
  viewAllLabel,
  compact = false,
  id,
}: CategoryGallerySectionProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const normalizedCategorySlugs = useMemo(
    () => [...new Set(categorySlugs.map((slug) => slug.trim()).filter(Boolean))],
    [categorySlugs],
  );

  const { data: fetchedPhotos = [], isLoading } = useQuery({
    queryKey: ["gallery-section", normalizedCategorySlugs.join(",")],
    queryFn: async () => {
      if (normalizedCategorySlugs.length === 0 || manualPhotos !== undefined) return [];

      const { data: categories } = await supabase
        .from("categories")
        .select("id, slug")
        .in("slug", normalizedCategorySlugs);

      if (!categories?.length) return [];

      const categoryIds = categories.map((category) => category.id);
      const { data } = await supabase
        .from("photos")
        .select("id, image_url, alt_text, location, title, display_order")
        .in("category_id", categoryIds)
        .eq("published", true)
        .order("display_order")
        .limit(9);

      return (data ?? []) as GalleryPhoto[];
    },
    enabled: normalizedCategorySlugs.length > 0 && manualPhotos === undefined,
  });

  const photos = manualPhotos ?? fetchedPhotos;

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && photos.length > 1) {
        event.preventDefault();
        setLightboxIndex((current) => (current === null ? 0 : (current + 1) % photos.length));
      }

      if (event.key === "ArrowLeft" && photos.length > 1) {
        event.preventDefault();
        setLightboxIndex((current) =>
          current === null ? photos.length - 1 : (current - 1 + photos.length) % photos.length,
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

  const featuredPhoto = photos[0];
  const galleryPhotos = photos.slice(1);
  const isSingle = variant === "single";
  const fallbackPhoto: GalleryPhoto | null =
    fallbackImageSrc && fallbackImageAlt
      ? {
          id: "fallback-photo",
          image_url: fallbackImageSrc,
          alt_text: fallbackImageAlt,
          location: null,
          title: null,
          display_order: 0,
        }
      : null;
  const mainPhoto = featuredPhoto ?? fallbackPhoto;
  const lightboxPhotos = photos.length > 0 ? photos : fallbackPhoto ? [fallbackPhoto] : [];
  const currentPhoto = lightboxIndex !== null ? (lightboxPhotos[lightboxIndex] ?? null) : null;

  return (
    <section
      id={id}
      className={
        compact
          ? "mt-0 [content-visibility:auto] [contain-intrinsic-size:1px_1200px]"
          : "mt-16 rounded-[32px] border border-border/70 bg-surface/70 p-6 md:p-8 shadow-[0_24px_70px_-50px_rgba(62,47,40,0.28)] [content-visibility:auto] [contain-intrinsic-size:1px_1200px]"
      }
    >
      {showHeader && (
        <div
          className={compact ? "mx-auto max-w-3xl text-center" : "mx-auto max-w-3xl text-center"}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
            {subtitle}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl italic text-primary leading-tight text-balance">
            {title}
          </h2>
          {!compact && description && (
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Chargement de la galerie…</div>
      ) : photos.length === 0 && !isSingle ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>Galerie en cours de remplissage…</p>
        </div>
      ) : isSingle ? (
        <div className="mt-10 space-y-8">
          {mainPhoto ? (
            <button
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setLightboxIndex(0);
              }}
              className="group relative block w-full overflow-hidden rounded-[30px] border border-border bg-muted aspect-[4/5] md:aspect-[16/10] transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_28px_80px_-44px_rgba(62,47,40,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2"
              aria-label={`Ouvrir la photo ${mainPhoto.title ?? mainPhoto.alt_text}`}
            >
              <GalleryImage
                photo={mainPhoto}
                sizes={SIZES_LARGE}
                width={1600}
                height={2000}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center p-5 md:p-6">
                <span className="rounded-full bg-white/90 px-5 py-2 text-[10px] uppercase tracking-[0.32em] text-foreground backdrop-blur-sm">
                  Découvrir
                </span>
              </div>
            </button>
          ) : (
            <div className="rounded-[30px] border border-border bg-surface/80 px-6 py-16 text-center shadow-[0_24px_70px_-50px_rgba(62,47,40,0.2)]">
              <p className="text-muted-foreground">Galerie en cours de remplissage…</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10 space-y-4 md:space-y-6">
          {featuredPhoto && (
            <button
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setLightboxIndex(0);
              }}
              className="group relative block w-full overflow-hidden rounded-[28px] border border-border bg-muted aspect-[16/10] md:aspect-[16/8] transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_28px_80px_-44px_rgba(62,47,40,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2"
              aria-label={`Ouvrir la photo ${featuredPhoto.title ?? featuredPhoto.alt_text}`}
            >
              <GalleryImage
                photo={featuredPhoto}
                sizes={SIZES_LARGE}
                width={1600}
                height={1200}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center p-5 md:p-6">
                <span className="rounded-full bg-white/90 px-5 py-2 text-[10px] uppercase tracking-[0.32em] text-foreground backdrop-blur-sm">
                  Découvrir
                </span>
              </div>
            </button>
          )}

          {galleryPhotos.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {galleryPhotos.map((photo, index) => {
                const galleryIndex = index + 1;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={(event) => {
                      triggerRef.current = event.currentTarget;
                      setLightboxIndex(galleryIndex);
                    }}
                    className="group relative block overflow-hidden rounded-[24px] border border-border bg-muted aspect-[4/5] transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_24px_70px_-44px_rgba(62,47,40,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2"
                    aria-label={`Ouvrir la photo ${photo.title ?? photo.alt_text}`}
                  >
                    <GalleryImage
                      photo={photo}
                      sizes={SIZES_TILE}
                      width={1200}
                      height={1500}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition duration-700 group-hover:bg-black/10" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center p-4">
                      <span className="rounded-full bg-white/90 px-4 py-2 text-[10px] uppercase tracking-[0.32em] text-foreground shadow-sm backdrop-blur-sm">
                        Découvrir
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="inline-flex items-center justify-center rounded-full border border-[#C6966F] bg-background px-8 py-3 text-sm uppercase tracking-[0.3em] text-[#C6966F] transition hover:bg-[#C6966F] hover:text-white"
          >
            {viewAllLabel ?? "Voir toute la galerie"}
          </Link>
        )}
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
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{currentPhoto?.alt_text}</DialogDescription>
          {currentPhoto && (
            <div className="flex h-[100svh] w-full flex-col text-white">
              <div className="flex-none px-4 pb-2 pt-5 sm:px-6 sm:pb-3 sm:pt-6 md:px-8 md:pt-8">
                <div className="max-w-3xl pr-16 sm:pr-20">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/60">
                    {subtitle}
                  </p>
                  <h3 className="mt-2 text-balance font-display text-lg italic sm:mt-3 sm:text-2xl md:text-3xl">
                    {currentPhoto.title ?? title}
                  </h3>
                </div>
              </div>

              <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
                <div className="flex w-full min-w-0 flex-1 items-center justify-center">
                  {currentPhoto.avif_srcset && currentPhoto.webp_srcset ? (
                    <picture>
                      <source type="image/avif" srcSet={currentPhoto.avif_srcset} sizes="(min-width: 1280px) 1280px, 96vw" />
                      <source type="image/webp" srcSet={currentPhoto.webp_srcset} sizes="(min-width: 1280px) 1280px, 96vw" />
                      <img
                        src={currentPhoto.image_url}
                        srcSet={currentPhoto.webp_srcset}
                        sizes="(min-width: 1280px) 1280px, 96vw"
                        alt={currentPhoto.alt_text}
                        width={1600}
                        height={1200}
                        loading="eager"
                        fetchPriority="high"
                        className="block rounded-[18px] object-contain shadow-2xl max-h-[calc(100svh-10rem)] max-w-[min(96vw,1200px)] sm:max-h-[calc(100svh-11rem)] md:max-h-[calc(100svh-10rem)] lg:max-h-[calc(100svh-9rem)] lg:max-w-[min(92vw,1280px)]"
                        decoding="async"
                      />
                    </picture>
                  ) : (
                    <img
                      src={currentPhoto.image_url}
                      alt={currentPhoto.alt_text}
                      width={1600}
                      height={1200}
                      loading="eager"
                      fetchPriority="high"
                      className="block rounded-[18px] object-contain shadow-2xl max-h-[calc(100svh-10rem)] max-w-[min(96vw,1200px)] sm:max-h-[calc(100svh-11rem)] md:max-h-[calc(100svh-10rem)] lg:max-h-[calc(100svh-9rem)] lg:max-w-[min(92vw,1280px)]"
                      decoding="async"
                    />
                  )}
                </div>
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
                      {`${(lightboxIndex ?? 0) + 1}/${lightboxPhotos.length}`}
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
    </section>
  );
}
