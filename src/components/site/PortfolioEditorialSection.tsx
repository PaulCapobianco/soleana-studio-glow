import { Link } from "@tanstack/react-router";
import { Reveal } from "./Reveal";
import catGrossesse from "@/assets/portfolio/grossesse.webp";
import catGrossesseSm from "@/assets/portfolio/grossesse-350.webp";
import catGrossesseMd from "@/assets/portfolio/grossesse-500.webp";
import catFamille from "@/assets/portfolio/famille.webp";
import catFamilleSm from "@/assets/portfolio/famille-350.webp";
import catFamilleMd from "@/assets/portfolio/famille-500.webp";
import catCouple from "@/assets/portfolio/couple.webp";
import catCoupleSm from "@/assets/portfolio/couple-350.webp";
import catCoupleMd from "@/assets/portfolio/couple-500.webp";
import catPortrait from "@/assets/portfolio/portrait.webp";
import catPortraitSm from "@/assets/portfolio/portrait-350.webp";
import catPortraitMd from "@/assets/portfolio/portrait-500.webp";

type PortfolioEditorialItem = {
  id: string;
  src: string;
  imgSmall: string;
  imgMedium: string;
  alt: string;
  category: string;
  categorySlug: string;
  positionClass: string;
  objectPosition?: string;
};

const categories = [
  {
    slug: "grossesse",
    label: "Grossesse",
    img: catGrossesse,
    imgSmall: catGrossesseSm,
    imgMedium: catGrossesseMd,
    alt: "Séance grossesse naturelle et lumineuse à Marseille",
    positionClass: "lg:col-span-6 lg:row-span-2",
    // Plain percentage only — a calc() value here triggers a Chrome
    // rendering bug with object-fit: cover (see AUDIT.md). Currently this
    // field isn't even read by the render below (separate pre-existing
    // objectClass/objectPosition mismatch, out of scope here); kept correct
    // so it doesn't reintroduce the bug if that gets fixed later.
    objectClass: "object-[58%_48%]",
  },
  {
    slug: "famille",
    label: "Famille",
    img: catFamille,
    imgSmall: catFamilleSm,
    imgMedium: catFamilleMd,
    alt: "Séance famille douce et lumineuse en extérieur à Marseille",
    positionClass: "lg:col-span-6 lg:row-span-2",
    objectPosition: "68% 48%",
  },
  {
    slug: "couple",
    label: "Couple",
    img: catCouple,
    imgSmall: catCoupleSm,
    imgMedium: catCoupleMd,
    alt: "Séance couple naturelle et lumineuse à Marseille",
    positionClass: "lg:col-span-7 lg:row-span-2",
    objectPosition: "50% 22%",
  },
  {
    slug: "portrait",
    label: "Portrait",
    img: catPortrait,
    imgSmall: catPortraitSm,
    imgMedium: catPortraitMd,
    alt: "Portrait naturel et élégant en lumière naturelle à Marseille",
    positionClass: "lg:col-span-5 lg:row-span-2",
  },
] as const;

const portfolioItems: PortfolioEditorialItem[] = [
  {
    id: "grossesse",
    src: categories[0].img,
    imgSmall: categories[0].imgSmall,
    imgMedium: categories[0].imgMedium,
    alt: categories[0].alt,
    category: categories[0].label,
    categorySlug: categories[0].slug,
    positionClass: categories[0].positionClass,
    objectPosition: categories[0].objectPosition,
  },
  {
    id: "famille",
    src: categories[1].img,
    imgSmall: categories[1].imgSmall,
    imgMedium: categories[1].imgMedium,
    alt: categories[1].alt,
    category: categories[1].label,
    categorySlug: categories[1].slug,
    positionClass: categories[1].positionClass,
    objectPosition: categories[1].objectPosition,
  },
  {
    id: "couple",
    src: categories[2].img,
    imgSmall: categories[2].imgSmall,
    imgMedium: categories[2].imgMedium,
    alt: categories[2].alt,
    category: categories[2].label,
    categorySlug: categories[2].slug,
    positionClass: categories[2].positionClass,
    objectPosition: categories[2].objectPosition,
  },
  {
    id: "portrait",
    src: categories[3].img,
    imgSmall: categories[3].imgSmall,
    imgMedium: categories[3].imgMedium,
    alt: categories[3].alt,
    category: categories[3].label,
    categorySlug: categories[3].slug,
    positionClass: categories[3].positionClass,
  },
];

export function PortfolioEditorialSection() {
  return (
    <section className="bg-surface py-24 px-6 text-foreground [content-visibility:auto] [contain-intrinsic-size:1px_1400px]">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
              Portfolio
            </p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-primary">
              MES RÉALISATIONS
            </h2>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground">
              Une composition douce et lumineuse, pensée comme un collage éditorial pour laisser
              respirer chaque image.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[repeat(4,minmax(0,18rem))]">
            {portfolioItems.map((item) => (
              <Link
                key={item.id}
                to="/$slug"
                params={{ slug: `photographe-${item.categorySlug}-marseille` }}
                className={`${item.positionClass} group relative block aspect-[3/4] overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_20px_60px_-44px_rgba(62,47,40,0.35)] transition-all duration-700 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_-40px_rgba(62,47,40,0.28)] lg:aspect-auto`}
              >
                <div className="absolute inset-0 bg-black/0 transition duration-700 group-hover:bg-black/5" />
                <div className="absolute left-4 top-4 z-10">
                  <span className="inline-flex items-center rounded-full border border-white/35 bg-white/82 px-4 py-1 text-[9px] uppercase tracking-[0.34em] text-primary shadow-[0_10px_24px_-18px_rgba(62,47,40,0.5)] backdrop-blur-sm">
                    {item.category}
                  </span>
                </div>
                <img
                  src={item.src}
                  srcSet={`${item.imgSmall} 350w, ${item.imgMedium} 500w, ${item.src} 700w`}
                  sizes="(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw"
                  alt={item.alt}
                  width={1600}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${item.objectClass ?? ""}`}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center p-5">
                  <span className="rounded-full bg-white/90 px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-foreground shadow-sm backdrop-blur-sm transition group-hover:bg-white">
                    Découvrir
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:mt-8 sm:flex-row">
            <Link
              to="/prestations"
              className="inline-flex items-center justify-center rounded-full border border-[#C6966F] bg-background px-8 py-3 text-sm uppercase tracking-[0.3em] text-[#C6966F] transition hover:bg-[#C6966F] hover:text-white"
            >
              VOIR LES TARIFS
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-[#C6966F] px-8 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#b8845f]"
            >
              RÉSERVER MA SÉANCE PHOTO
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
