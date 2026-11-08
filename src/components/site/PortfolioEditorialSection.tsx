import { Link } from "@tanstack/react-router";
import { Reveal } from "./Reveal";
import catGrossesse from "@/assets/portfolio/grossesse.webp";
import catGrossesseAvif from "@/assets/portfolio/grossesse.avif";
import catGrossesseSm from "@/assets/portfolio/grossesse-350.webp";
import catGrossesseSmAvif from "@/assets/portfolio/grossesse-350.avif";
import catGrossesseMd from "@/assets/portfolio/grossesse-500.webp";
import catGrossesseMdAvif from "@/assets/portfolio/grossesse-500.avif";
import catGrossesseLg from "@/assets/portfolio/grossesse-800.webp";
import catGrossesseLgAvif from "@/assets/portfolio/grossesse-800.avif";
import catGrossesseXl from "@/assets/portfolio/grossesse-1200.webp";
import catGrossesseXlAvif from "@/assets/portfolio/grossesse-1200.avif";
import catGrossesseXxl from "@/assets/portfolio/grossesse-1800.webp";
import catGrossesseXxlAvif from "@/assets/portfolio/grossesse-1800.avif";
import catFamille from "@/assets/portfolio/famille.webp";
import catFamilleAvif from "@/assets/portfolio/famille.avif";
import catFamilleSm from "@/assets/portfolio/famille-350.webp";
import catFamilleSmAvif from "@/assets/portfolio/famille-350.avif";
import catFamilleMd from "@/assets/portfolio/famille-500.webp";
import catFamilleMdAvif from "@/assets/portfolio/famille-500.avif";
import catFamilleLg from "@/assets/portfolio/famille-800.webp";
import catFamilleLgAvif from "@/assets/portfolio/famille-800.avif";
import catFamilleXl from "@/assets/portfolio/famille-1200.webp";
import catFamilleXlAvif from "@/assets/portfolio/famille-1200.avif";
import catFamilleXxl from "@/assets/portfolio/famille-1800.webp";
import catFamilleXxlAvif from "@/assets/portfolio/famille-1800.avif";
import catCouple from "@/assets/portfolio/couple.webp";
import catCoupleAvif from "@/assets/portfolio/couple.avif";
import catCoupleSm from "@/assets/portfolio/couple-350.webp";
import catCoupleSmAvif from "@/assets/portfolio/couple-350.avif";
import catCoupleMd from "@/assets/portfolio/couple-500.webp";
import catCoupleMdAvif from "@/assets/portfolio/couple-500.avif";
import catCoupleLg from "@/assets/portfolio/couple-800.webp";
import catCoupleLgAvif from "@/assets/portfolio/couple-800.avif";
import catCoupleXl from "@/assets/portfolio/couple-1200.webp";
import catCoupleXlAvif from "@/assets/portfolio/couple-1200.avif";
import catCoupleXxl from "@/assets/portfolio/couple-1800.webp";
import catCoupleXxlAvif from "@/assets/portfolio/couple-1800.avif";
import catPortrait from "@/assets/portfolio/portrait.webp";
import catPortraitAvif from "@/assets/portfolio/portrait.avif";
import catPortraitSm from "@/assets/portfolio/portrait-350.webp";
import catPortraitSmAvif from "@/assets/portfolio/portrait-350.avif";
import catPortraitMd from "@/assets/portfolio/portrait-500.webp";
import catPortraitMdAvif from "@/assets/portfolio/portrait-500.avif";
import catPortraitLg from "@/assets/portfolio/portrait-800.webp";
import catPortraitLgAvif from "@/assets/portfolio/portrait-800.avif";
import catPortraitXl from "@/assets/portfolio/portrait-1200.webp";
import catPortraitXlAvif from "@/assets/portfolio/portrait-1200.avif";
import catPortraitXxl from "@/assets/portfolio/portrait-1800.webp";
import catPortraitXxlAvif from "@/assets/portfolio/portrait-1800.avif";

type PortfolioEditorialItem = {
  id: string;
  src: string;
  srcAvif: string;
  imgSmall: string;
  imgSmallAvif: string;
  imgMedium: string;
  imgMediumAvif: string;
  imgLarge: string;
  imgLargeAvif: string;
  imgXLarge: string;
  imgXLargeAvif: string;
  imgXXLarge: string;
  imgXXLargeAvif: string;
  alt: string;
  category: string;
  categorySlug: string;
  positionClass: string;
  // Tailwind arbitrary-value class(es), e.g. "object-[50%_22%]" — never a
  // calc() with a raw px term (see the note on the grossesse entry below).
  objectClass?: string;
};

const categories = [
  {
    slug: "grossesse",
    label: "Grossesse",
    img: catGrossesse,
    imgAvif: catGrossesseAvif,
    imgSmall: catGrossesseSm,
    imgSmallAvif: catGrossesseSmAvif,
    imgMedium: catGrossesseMd,
    imgMediumAvif: catGrossesseMdAvif,
    imgLarge: catGrossesseLg,
    imgLargeAvif: catGrossesseLgAvif,
    imgXLarge: catGrossesseXl,
    imgXLargeAvif: catGrossesseXlAvif,
    imgXXLarge: catGrossesseXxl,
    imgXXLargeAvif: catGrossesseXxlAvif,
    alt: "Séance grossesse naturelle et lumineuse à Marseille",
    positionClass: "lg:col-span-6 lg:row-span-2",
    // Plain percentage only — never calc() with a raw px term:
    // object-position resolves as (containerSize - objectSize) * percentage
    // + pxOffset, and this image's aspect ratio makes object-fit: cover
    // always width-driven with zero horizontal overflow (at every box
    // shape this component uses, below "lg" and at "lg" alike), so a px
    // term would apply in full and shift the image straight out of the
    // box. Percentages alone always scale safely with that (zero)
    // overflow. Same value as the homepage card — do not change.
    objectClass: "object-[58%_48%]",
  },
  {
    slug: "famille",
    label: "Famille",
    img: catFamille,
    imgAvif: catFamilleAvif,
    imgSmall: catFamilleSm,
    imgSmallAvif: catFamilleSmAvif,
    imgMedium: catFamilleMd,
    imgMediumAvif: catFamilleMdAvif,
    imgLarge: catFamilleLg,
    imgLargeAvif: catFamilleLgAvif,
    imgXLarge: catFamilleXl,
    imgXLargeAvif: catFamilleXlAvif,
    imgXXLarge: catFamilleXxl,
    imgXXLargeAvif: catFamilleXxlAvif,
    alt: "Séance famille douce et lumineuse en extérieur à Marseille",
    positionClass: "lg:col-span-6 lg:row-span-2",
    objectClass: "object-[68%_48%]",
  },
  {
    slug: "couple",
    label: "Couple",
    img: catCouple,
    imgAvif: catCoupleAvif,
    imgSmall: catCoupleSm,
    imgSmallAvif: catCoupleSmAvif,
    imgMedium: catCoupleMd,
    imgMediumAvif: catCoupleMdAvif,
    imgLarge: catCoupleLg,
    imgLargeAvif: catCoupleLgAvif,
    imgXLarge: catCoupleXl,
    imgXLargeAvif: catCoupleXlAvif,
    imgXXLarge: catCoupleXxl,
    imgXXLargeAvif: catCoupleXxlAvif,
    alt: "Séance couple naturelle et lumineuse à Marseille",
    positionClass: "lg:col-span-7 lg:row-span-2",
    // Frame on the top to keep both faces/the kiss in view. This card's
    // box is far wider than aspect-[3/4] at "lg" (col-span-7 vs. the
    // default), which crops far more of the image height — verified this
    // single value still keeps the full kiss in frame in both the
    // aspect-[3/4] regime (below "lg") and the wide "lg" box.
    objectClass: "object-[50%_22%]",
  },
  {
    slug: "portrait",
    label: "Portrait",
    img: catPortrait,
    imgAvif: catPortraitAvif,
    imgSmall: catPortraitSm,
    imgSmallAvif: catPortraitSmAvif,
    imgMedium: catPortraitMd,
    imgMediumAvif: catPortraitMdAvif,
    imgLarge: catPortraitLg,
    imgLargeAvif: catPortraitLgAvif,
    imgXLarge: catPortraitXl,
    imgXLargeAvif: catPortraitXlAvif,
    imgXXLarge: catPortraitXxl,
    imgXXLargeAvif: catPortraitXxlAvif,
    alt: "Portrait naturel et élégant en lumière naturelle à Marseille",
    positionClass: "lg:col-span-5 lg:row-span-2",
    // Subject is already close to horizontally centered in the source
    // photo; the default (centered) object-position already frames her
    // correctly, no override needed.
  },
] as const;

const portfolioItems: PortfolioEditorialItem[] = categories.map((c) => ({
  id: c.slug,
  src: c.img,
  srcAvif: c.imgAvif,
  imgSmall: c.imgSmall,
  imgSmallAvif: c.imgSmallAvif,
  imgMedium: c.imgMedium,
  imgMediumAvif: c.imgMediumAvif,
  imgLarge: c.imgLarge,
  imgLargeAvif: c.imgLargeAvif,
  imgXLarge: c.imgXLarge,
  imgXLargeAvif: c.imgXLargeAvif,
  imgXXLarge: c.imgXXLarge,
  imgXXLargeAvif: c.imgXXLargeAvif,
  alt: c.alt,
  category: c.label,
  categorySlug: c.slug,
  positionClass: c.positionClass,
  objectClass: "objectClass" in c ? c.objectClass : undefined,
}));

export function PortfolioEditorialSection() {
  return (
    <section className="bg-surface py-24 px-6 text-foreground [content-visibility:auto] [contain-intrinsic-size:1px_1400px]">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
              Portfolio
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-primary">
              MES RÉALISATIONS
            </h1>
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
                <picture>
                  <source
                    type="image/avif"
                    srcSet={[
                      `${item.imgSmallAvif} 350w`,
                      `${item.imgMediumAvif} 500w`,
                      `${item.srcAvif} 700w`,
                      `${item.imgLargeAvif} 800w`,
                      `${item.imgXLargeAvif} 1200w`,
                      `${item.imgXXLargeAvif} 1800w`,
                    ].join(", ")}
                    sizes="(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw"
                  />
                  <img
                    src={item.src}
                    srcSet={[
                      `${item.imgSmall} 350w`,
                      `${item.imgMedium} 500w`,
                      `${item.src} 700w`,
                      `${item.imgLarge} 800w`,
                      `${item.imgXLarge} 1200w`,
                      `${item.imgXXLarge} 1800w`,
                    ].join(", ")}
                    sizes="(min-width: 1024px) 50vw, (min-width: 768px) 50vw, 100vw"
                    alt={item.alt}
                    width={1600}
                    height={1200}
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${item.objectClass ?? ""}`}
                  />
                </picture>
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
