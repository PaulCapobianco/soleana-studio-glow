import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { HeroSlideshow } from "@/components/site/HeroSlideshow";
import { Reveal } from "@/components/site/Reveal";
import { GoogleIcon } from "@/components/site/GoogleIcon";
import hero1 from "@/assets/accueil/hero_1.webp";
import hero1Avif from "@/assets/accueil/hero_1.avif";
import hero2 from "@/assets/accueil/hero_2.webp";
import hero2Avif from "@/assets/accueil/hero_2.avif";
import hero3 from "@/assets/accueil/hero_3.webp";
import hero3Avif from "@/assets/accueil/hero_3.avif";
import hero4 from "@/assets/accueil/hero_4.webp";
import hero4Avif from "@/assets/accueil/hero_4.avif";
import logoSoleana from "@/assets/logo-soleana.webp";
import logoSoleanaAvif from "@/assets/logo-soleana.avif";
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
import aboutPortrait from "@/assets/accueil/anais_1.webp";
import aboutPortraitAvif from "@/assets/accueil/anais_1.avif";
import logoSoleana180 from "@/assets/logo-soleana-180.webp";
import logoSoleana180Avif from "@/assets/logo-soleana-180.avif";
import logoSoleana280 from "@/assets/logo-soleana-280.webp";
import logoSoleana280Avif from "@/assets/logo-soleana-280.avif";
import type { Database } from "@/integrations/supabase/types";
import { isGoogleReviewUrl } from "@/lib/google-review-url";
import { absoluteUrl, buildPageSeo } from "@/lib/seo";
import { useSiteSettings } from "@/lib/site-settings";
import { NoelShowcase } from "@/components/site/NoelShowcase";
import { getNoel2026EditionState } from "@/lib/noel-2026.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { isEditionOver } = await getNoel2026EditionState();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[home.services] Missing Supabase public env vars.");
      return { services: [], reviews: [], isNoelTeaserVisible: !isEditionOver };
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
    const reviewsPromise = loadPublishedReviews(supabaseUrl, headers);
    let services: HomeService[] = [];

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/services?select=id,name,description,price_eur,featured,features,active,display_order&active=eq.true&order=display_order.asc`,
        { headers },
      );

      if (response.ok) {
        services = (await response.json()) as HomeService[];
      } else {
        console.error("[home.services] Failed to fetch services:", response.status);
      }
    } catch (error) {
      console.error("[home.services] Failed to fetch services:", error);
    }

    return {
      services,
      reviews: await reviewsPromise,
      isNoelTeaserVisible: !isEditionOver,
    };
  },
  head: () => {
    const seo = buildPageSeo({
      title: "Soleana Studio — Photographe lifestyle Marseille & Provence",
      description:
        "Photographe grossesse, famille, couple et portrait à Marseille. Séances douces, naturelles et lumineuses. Découvrez l'univers Soleana Studio.",
      path: "/",
      ogTitle: "Soleana Studio — Photographe lifestyle Marseille",
      ogDescription: "Des souvenirs doux, vrais et lumineux.",
    });

    return {
      ...seo,
      meta: [...seo.meta, { property: "og:image", content: absoluteUrl(hero1) }],
      links: [
        ...seo.links,
        {
          rel: "preload",
          as: "image",
          href: logoSoleana280Avif,
          type: "image/avif",
          fetchPriority: "high" as const,
        },
        {
          rel: "preload",
          as: "image",
          href: hero1Avif,
          type: "image/avif",
          fetchPriority: "high" as const,
        },
      ],
    };
  },
  component: Home,
});

type HomeService = {
  id: string;
  name: string;
  description: string;
  price_eur: number;
  featured: boolean;
  features: string[];
  active: boolean;
  display_order: number;
};

type HomeReview = Pick<
  Database["public"]["Tables"]["reviews"]["Row"],
  "id" | "first_name" | "comment" | "rating" | "google_review_url" | "display_order"
>;

async function loadPublishedReviews(
  supabaseUrl: string,
  headers: { apikey: string; Authorization: string },
): Promise<HomeReview[]> {
  const url = new URL("/rest/v1/reviews", supabaseUrl);
  url.searchParams.set("select", "id,first_name,comment,rating,google_review_url,display_order");
  url.searchParams.set("published", "eq.true");
  url.searchParams.set("order", "display_order.asc,id.asc");

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error("[home.reviews] Failed to fetch reviews:", response.status);
      return [];
    }

    const reviews: unknown = await response.json();
    return Array.isArray(reviews) ? (reviews as HomeReview[]) : [];
  } catch (error) {
    console.error("[home.reviews] Failed to fetch reviews:", error);
    return [];
  }
}

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
    offset: false,
    // Plain percentage only — DO NOT use calc(). object-position resolves
    // as (containerSize - objectSize) * percentage + pxOffset. This image's
    // aspect ratio makes object-fit: cover always width-driven with zero
    // horizontal overflow at every breakpoint, so (containerSize -
    // objectSize) is 0 and any percentage term is multiplied away — but a
    // raw px term in a calc() still applies in full, shifting the image
    // straight out of the box and exposing its background. Percentage-only
    // values are always safe here since they scale with the (zero) overflow.
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
    offset: true,
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
    offset: false,
    // Frame on the top of the photo to keep both faces/the kiss in view —
    // this box is also width-driven cover (portrait image, see grossesse's
    // note), so only the y value has any visible effect.
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
    offset: true,
    // Subject is already close to horizontally centered in the source
    // photo; the default (centered) object-position already frames her
    // correctly, no override needed.
  },
];

const seoMap: Record<string, string> = {
  grossesse: "photographe-grossesse-marseille",
  famille: "photographe-famille-marseille",
  couple: "photographe-couple-marseille",
  portrait: "photographe-portrait-marseille",
};

function Home() {
  const { googleReviewUrl, serviceArea } = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const { services, reviews, isNoelTeaserVisible } = Route.useLoaderData();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <SiteShell overlay>
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full overflow-hidden">
        <HeroSlideshow
          images={[
            {
              src: hero1,
              avifSrc: hero1Avif,
              alt: "Future maman dans un champ de blé doré au coucher du soleil en Provence",
            },
            {
              src: hero2,
              avifSrc: hero2Avif,
              alt: "Couple enlacé sur les falaises de Cassis au coucher du soleil",
            },
            {
              src: hero3,
              avifSrc: hero3Avif,
              alt: "Famille marchant pieds nus sur une plage de Méditerranée",
            },
            {
              src: hero4,
              avifSrc: hero4Avif,
              alt: "Portrait lifestyle doux et lumineux en lumière naturelle",
            },
          ]}
        />
        <div
          className={`pointer-events-none absolute left-6 top-24 z-10 hidden xl:block xl:left-10 transition-opacity duration-300 ${
            scrolled ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden={scrolled}
        >
          <picture>
            <source
              type="image/avif"
              srcSet={`${logoSoleana180Avif} 180w, ${logoSoleana280Avif} 280w, ${logoSoleanaAvif} 404w`}
              sizes="(min-width: 1280px) 350px, 280px"
            />
            <img
              src={logoSoleana280}
              srcSet={`${logoSoleana180} 180w, ${logoSoleana280} 280w, ${logoSoleana} 404w`}
              sizes="(min-width: 1280px) 350px, 280px"
              alt="Soleana Studio"
              width={360}
              height={180}
              className="w-[260px] max-w-[24vw] h-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.22)] xl:w-[350px] xl:max-w-[35vw]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center lg:pt-28 xl:pt-24">
          <div className="mb-8 flex justify-center xl:hidden">
            <picture>
              <source
                type="image/avif"
                srcSet={`${logoSoleana180Avif} 180w, ${logoSoleana280Avif} 280w, ${logoSoleanaAvif} 404w`}
                sizes="(max-width: 1279px) 280px, 350px"
              />
              <img
                src={logoSoleana280}
                srcSet={`${logoSoleana180} 180w, ${logoSoleana280} 280w, ${logoSoleana} 404w`}
                sizes="(max-width: 1279px) 280px, 350px"
                alt="Soleana Studio"
                width={240}
                height={120}
                className="w-[clamp(180px,56vw,280px)] lg:w-[220px] h-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.22)]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white italic leading-[1.05] mb-8 sm:mb-10 max-w-5xl animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            Des souvenirs doux,
            <br />
            vrais et lumineux
          </h1>
          <p
            className="text-white/85 text-base sm:text-lg max-w-xl mb-10 animate-slide-up font-light"
            style={{ animationDelay: "400ms" }}
          >
            Photographe grossesse, famille, couple et portrait à Marseille et alentours.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 animate-slide-up"
            style={{ animationDelay: "600ms" }}
          >
            <Link
              to="/prestations"
              className="px-10 py-4 bg-[#8A5A44] text-white uppercase text-[11px] tracking-[0.3em] hover:bg-[#724835] transition-all duration-500"
            >
              Découvrir les séances
            </Link>
            <Link
              to="/contact"
              className="px-10 py-4 border border-white/40 text-white uppercase text-[11px] tracking-[0.3em] backdrop-blur-sm hover:bg-white/10 transition-all duration-500"
            >
              Réserver une séance
            </Link>
          </div>
          <p
            className="mt-10 max-w-[calc(100%-1.5rem)] text-center font-sans text-[9px] uppercase tracking-[0.25em] text-white/60 whitespace-normal animate-fade-in lg:absolute lg:bottom-24 lg:left-1/2 lg:mt-0 lg:max-w-none lg:-translate-x-1/2 lg:whitespace-nowrap"
            style={{
              animationDelay: "900ms",
              textShadow: "0 0 10px rgba(255, 255, 255, 0.85)",
            }}
          >
            {serviceArea}
          </p>
        </div>
      </section>

      {/* TEASER — MINI-SÉANCES DE NOËL 2026 */}
      {isNoelTeaserVisible && <NoelShowcase />}

      {/* INTRO */}
      <section className="py-32 px-6 max-w-4xl mx-auto text-center [content-visibility:auto] [contain-intrinsic-size:1px_900px]">
        <Reveal>
          <h2 className="font-display text-3xl md:text-5xl italic text-primary mb-10 leading-tight text-balance">
            Des instants, baignés de lumière
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto text-pretty">
            Photographe à Marseille et alentours, je vous accompagne dans des séances naturelles et
            lumineuses pour garder une trace sincère de vos moments de vie : maternité, famille,
            couple, baptême, mariage ou anniversaire.
          </p>
        </Reveal>
      </section>

      {/* PRESTATIONS GRID */}
      <section className="pb-32 px-6 [content-visibility:auto] [contain-intrinsic-size:1px_1200px]">
        <Reveal className="text-center mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
            Vos instants à capturer
          </p>
        </Reveal>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 80}>
              <Link
                to="/$slug"
                params={{ slug: seoMap[c.slug] }}
                className={`relative group block aspect-[3/4] overflow-hidden bg-[#3E2F28] ${c.offset ? "md:mt-12" : ""}`}
              >
                <picture>
                  <source
                    type="image/avif"
                    srcSet={[
                      `${c.imgSmallAvif} 350w`,
                      `${c.imgMediumAvif} 500w`,
                      `${c.imgAvif} 700w`,
                      `${c.imgLargeAvif} 800w`,
                      `${c.imgXLargeAvif} 1200w`,
                    ].join(", ")}
                    sizes="(min-width: 768px) 25vw, 42vw"
                  />
                  <img
                    src={c.img}
                    srcSet={[
                      `${c.imgSmall} 350w`,
                      `${c.imgMedium} 500w`,
                      `${c.img} 700w`,
                      `${c.imgLarge} 800w`,
                      `${c.imgXLarge} 1200w`,
                    ].join(", ")}
                    sizes="(min-width: 768px) 25vw, 42vw"
                    alt={`Photographe ${c.label.toLowerCase()} à Marseille`}
                    width={1200}
                    height={1600}
                    className={`absolute inset-0 block h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05] ${c.slug === "famille" ? "object-[68%_50%]" : ""} ${c.objectClass ?? ""}`}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                <div className="absolute bottom-0 left-0 z-20 p-6 md:p-8">
                  <h3 className="text-white font-display text-2xl md:text-3xl italic">{c.label}</h3>
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/85"
                    style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.85)" }}
                  >
                    Découvrir →
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* EXPÉRIENCE */}
      <section className="bg-surface py-32 border-y border-border [content-visibility:auto] [contain-intrinsic-size:1px_1200px]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 md:gap-24 items-center">
            <Reveal className="w-full md:w-1/2">
              <picture>
                <source type="image/avif" srcSet={aboutPortraitAvif} />
                <img
                  src={aboutPortrait}
                  alt="Soleana, photographe lifestyle à Marseille"
                  width={1200}
                  height={1500}
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </Reveal>
            <div className="w-full md:w-1/2 space-y-12">
              <Reveal>
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                  L'expérience Soleana
                </p>
                <h2 className="font-display text-4xl md:text-5xl italic text-foreground leading-tight">
                  Un accompagnement
                  <br />
                  doux & sur-mesure
                </h2>
              </Reveal>

              {[
                {
                  step: "01",
                  title: "Premier échange",
                  text: "Nous prenons le temps d’échanger sur votre projet, vos envies et l’histoire que vous souhaitez raconter à travers cette séance photo à Marseille ou alentours.",
                },
                {
                  step: "02",
                  title: "Préparation de la séance",
                  text: "Je vous accompagne dans le choix du lieu, des tenues et de l’ambiance pour créer des images naturelles, lumineuses et fidèles à votre univers.",
                },
                {
                  step: "03",
                  title: "Pendant la séance",
                  text: "Je vous guide avec douceur et bienveillance, sans poses figées, pour laisser place aux gestes naturels, aux regards sincères et aux émotions vraies.",
                },
                {
                  step: "04",
                  title: "Sélection et retouche",
                  text: "Après la séance, je trie et retouche soigneusement vos photos afin de préserver la douceur, la lumière et l’authenticité de chaque instant.",
                },
                {
                  step: "05",
                  title: "Livraison de votre galerie",
                  text: "Vous recevez une galerie privée sous 2 à 3 semaines, avec vos images prêtes à être découvertes, partagées et conservées comme de précieux souvenirs.",
                },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 100}>
                  <div className="flex gap-6 items-start">
                    <span className="font-mono text-accent text-sm pt-1">{s.step}</span>
                    <div>
                      <h3 className="font-sans font-semibold text-primary uppercase text-xs tracking-[0.25em] mb-2">
                        {s.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-32 px-6 [content-visibility:auto] [contain-intrinsic-size:1px_1200px]">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-5xl italic mb-4">
              Des souvenirs à votre image
            </h2>
            <p className="text-muted-foreground">
              Maternité, famille, couple ou événement, chaque séance photo est imaginée pour créer
              des souvenirs naturels, lumineux et fidèles à ce que vous vivez.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(services ?? []).map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <div
                  className={`relative flex h-full flex-col p-8 lg:p-10 bg-surface transition-all duration-500 ${s.featured ? "border-2 border-accent" : "border border-border hover:border-accent"}`}
                >
                  {s.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 text-[9px] uppercase tracking-[0.3em] whitespace-nowrap">
                      Populaire
                    </span>
                  )}
                  <h3 className="font-display text-3xl italic mb-1 text-primary">{s.name}</h3>
                  <p className="text-accent font-mono text-sm mb-8">{s.price_eur}€</p>
                  <ul className="text-sm text-muted-foreground space-y-3 mb-10 border-t border-border pt-6">
                    {(s.features ?? []).slice(0, 5).map((f: string) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-accent">·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/prestations"
                    className={`mt-auto block w-full py-3 text-center text-[10px] uppercase tracking-[0.3em] transition-all ${s.featured ? "bg-[#C6966F] text-white hover:bg-[#b8845f]" : "border border-[#C6966F] text-[#C6966F] hover:bg-[#C6966F] hover:text-white"}`}
                  >
                    En savoir plus
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-12">
            <p className="text-sm italic text-muted-foreground max-w-2xl mx-auto">
              « Mes formules peuvent être adaptées à votre projet, vos envies, alors n'hésitez pas à
              me contacter pour en discuter ensemble. »
            </p>
          </Reveal>
        </div>
      </section>

      {/* AVIS */}
      {reviews.length > 0 && (
        <section className="bg-surface py-32 px-6 border-y border-border [content-visibility:auto] [contain-intrinsic-size:1px_1200px]">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-16">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                Ils en parlent
              </p>
              <h2 className="font-display text-4xl md:text-5xl italic">Avis sincères</h2>
            </Reveal>
            <Reveal className="mb-12 flex justify-center" delay={90}>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Laisser un avis Google pour Soleana Studio"
                className="inline-flex items-center gap-3 rounded-full border border-[#D9C3AF] bg-[#FFFDF8] px-6 py-3.5 text-sm font-semibold text-foreground shadow-[0_16px_40px_-28px_rgba(62,47,40,0.22)] transition-all hover:-translate-y-0.5 hover:border-[#C6966F] hover:shadow-[0_18px_44px_-28px_rgba(198,150,111,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <GoogleIcon className="h-7 w-7 shrink-0" />
                <span>Laisser un avis Google</span>
              </a>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {reviews.map((review, i) => (
                <Reveal key={review.id} delay={i * 90}>
                  <article className="flex h-full flex-col rounded-[28px] border border-border bg-background p-8 shadow-[0_18px_50px_-38px_rgba(62,47,40,0.28)]">
                    <p className="text-accent text-sm tracking-widest">
                      {"★".repeat(review.rating)}
                    </p>
                    <p className="mt-5 flex-1 font-display text-xl italic text-foreground leading-relaxed">
                      {review.comment}
                    </p>
                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {review.first_name}
                      </p>
                      {isGoogleReviewUrl(review.google_review_url) && (
                        <a
                          href={review.google_review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-end text-accent transition-transform hover:scale-105"
                          aria-label={`Lire l'avis Google de ${review.first_name}`}
                        >
                          <GoogleIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-foreground text-background py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <Reveal>
            <h2 className="font-display text-5xl md:text-6xl italic leading-tight">
              Prêts à capturer
              <br />
              votre éclat ?
            </h2>
            <p className="text-background/60 max-w-md mx-auto leading-relaxed">
              Écrivez-moi pour discuter de votre projet et créons ensemble des souvenirs
              impérissables.
            </p>
            <div className="pt-4 flex flex-wrap gap-4 justify-center">
              <Link
                to="/contact"
                className="px-10 py-4 bg-accent text-foreground uppercase text-[11px] tracking-[0.3em] hover:bg-background transition-colors"
              >
                Réserver une séance
              </Link>
              <Link
                to="/portfolio"
                className="px-10 py-4 border border-background/30 uppercase text-[11px] tracking-[0.3em] hover:bg-background/10 transition-colors"
              >
                Voir le portfolio
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
