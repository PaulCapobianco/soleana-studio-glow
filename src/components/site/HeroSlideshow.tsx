import { useEffect, useState } from "react";

export function HeroSlideshow({ images }: { images: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (images.length <= 1 || paused || reducedMotion) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 5500);
    return () => window.clearInterval(id);
  }, [images.length, paused, reducedMotion]);

  useEffect(() => {
    if (images.length <= 1 || paused || reducedMotion) return;

    const nextIndex = (index + 1) % images.length;
    const preloadNextImage = () => {
      const timeout = window.setTimeout(() => {
        const nextImage = new Image();
        nextImage.decoding = "async";
        nextImage.src = images[nextIndex].src;
      }, 2500);

      return () => window.clearTimeout(timeout);
    };

    if (document.readyState === "complete") {
      return preloadNextImage();
    }

    let cleanupTimeout: (() => void) | undefined;
    const onLoad = () => {
      cleanupTimeout = preloadNextImage();
    };

    window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
      cleanupTimeout?.();
    };
  }, [images, index, paused, reducedMotion]);

  return (
    <div className="absolute inset-0 bg-foreground">
      <div className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out opacity-100">
        <img
          key={images[index]?.src}
          src={images[index]?.src}
          alt={images[index]?.alt}
          width={1600}
          height={900}
          className="h-full w-full object-cover animate-slow-zoom"
          style={{ animationPlayState: paused || reducedMotion ? "paused" : "running" }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="absolute inset-0 bg-foreground/30" />
      {images.length > 1 && !reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          className="absolute bottom-6 left-6 z-20 rounded-full border border-white/50 bg-black/50 px-4 py-2 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {paused ? "Reprendre le diaporama" : "Mettre le diaporama en pause"}
        </button>
      )}
    </div>
  );
}
