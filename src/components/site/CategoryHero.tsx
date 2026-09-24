interface CategoryHeroProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export function CategoryHero({ title, description, imageSrc, imageAlt }: CategoryHeroProps) {
  return (
    <div className="relative min-h-[72svh] md:h-[600px] overflow-hidden">
      <img
        src={imageSrc}
        alt={imageAlt}
        width={1600}
        height={900}
        className="w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 sm:px-6">
        <h1 className="font-display text-[clamp(2.5rem,6.5vw,4.75rem)] text-white italic leading-[1.05] mb-4 sm:mb-6 max-w-5xl text-balance">
          {title}
        </h1>
        <p className="max-w-2xl text-pretty text-base font-light text-white/90 sm:text-lg md:text-xl">
          {description}
        </p>
      </div>
    </div>
  );
}
