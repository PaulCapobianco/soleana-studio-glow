import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type Photo = {
  id: string;
  image_url: string;
  alt_text: string;
  location?: string;
  title?: string;
};

interface CategoryGalleryProps {
  categorySlug: string;
}

export function CategoryGallery({ categorySlug }: CategoryGalleryProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) {
      delete document.body.dataset.galleryOpen;
      return;
    }

    document.body.dataset.galleryOpen = "true";
    return () => {
      delete document.body.dataset.galleryOpen;
    };
  }, [lightbox]);

  const { data: category } = useQuery({
    queryKey: ["category", categorySlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", categorySlug)
        .maybeSingle();
      return data;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", category?.id],
    queryFn: async () => {
      if (!category?.id) return [];
      const { data } = await supabase
        .from("photos")
        .select("id, image_url, alt_text, location, title")
        .eq("category_id", category.id)
        .eq("published", true)
        .order("display_order");
      return data || [];
    },
    enabled: !!category?.id,
  });

  if (photos.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Galerie en cours de remplissage...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setLightbox(photo.image_url)}
            className="group relative overflow-hidden rounded-[24px] aspect-square bg-muted border border-border transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-44px_rgba(62,47,40,0.35)]"
          >
            <img
              src={photo.image_url}
              alt={photo.alt_text}
              width={1200}
              height={1200}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "low"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 transition duration-500 group-hover:bg-black/10" />
            {photo.location && (
              <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {photo.location}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex h-[100svh] flex-col overflow-hidden bg-foreground/95 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-full border border-white/15 bg-black/30 p-2 text-background backdrop-blur-sm sm:right-6 sm:top-6"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="flex min-h-0 flex-1 items-center justify-center px-4 py-16 sm:px-6 sm:py-20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex w-full items-center justify-center">
              <img
                src={lightbox}
                alt=""
                width={1600}
                height={1200}
                className="block max-h-[calc(100svh-7rem)] max-w-[min(100vw-2rem,1200px)] object-contain shadow-2xl sm:max-h-[calc(100svh-8rem)] lg:max-h-[calc(100svh-6rem)] lg:max-w-[min(92vw,1320px)]"
                decoding="async"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
