type GalleryCategoryCardProps = {
  href: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  buttonLabel?: string;
};

export function GalleryCategoryCard({
  href,
  title,
  description,
  imageSrc,
  imageAlt,
  buttonLabel = "Découvrir",
}: GalleryCategoryCardProps) {
  return (
    <a
      href={href}
      className="group relative overflow-hidden rounded-[28px] border border-[#E8DCCF] bg-[#FFFDF8] shadow-[0_20px_60px_-44px_rgba(62,47,40,0.25)] transition-all duration-700 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_-40px_rgba(62,47,40,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={imageSrc}
          alt={imageAlt}
          width={1200}
          height={1500}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </div>

      <div className="space-y-3 px-5 py-5 text-left">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#C89B7B]">
            Galerie
          </p>
          <h3 className="mt-2 font-display text-2xl italic text-[#3E2F28]">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-[#7A6A61]">{description}</p>
        <span className="inline-flex items-center justify-center rounded-full border border-[#C6966F] bg-transparent px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#C6966F] transition group-hover:bg-[#C6966F] group-hover:text-white">
          {buttonLabel}
        </span>
      </div>
    </a>
  );
}
