import { useEffect, useState } from "react";

export function HeroSlideshow({ images }: { images: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 5500);
    return () => window.clearInterval(id);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;

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
  }, [images, index]);

  return (
    <div className="absolute inset-0 z-0 bg-foreground">
      <div className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out opacity-100">
        <img
          key={images[index]?.src}
          src={images[index]?.src}
          alt={images[index]?.alt}
          width={1600}
          height={900}
          className="h-full w-full object-cover animate-slow-zoom"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="absolute inset-0 bg-foreground/30" />
    </div>
  );
}
