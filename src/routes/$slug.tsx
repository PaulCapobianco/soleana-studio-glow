import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryGallerySection } from "@/components/site/CategoryGallerySection";
import { buildPageSeo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

type GalleryPhoto = {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  alt_text: string;
  location: string | null;
  title: string | null;
  display_order: number;
};

type GalleryAssetMap = Record<string, string>;

const toAssetMap = (assets: Record<string, unknown>): GalleryAssetMap =>
  Object.fromEntries(
    Object.entries(assets).map(([path, src]) => [
      path.split("/").pop()?.replace(".webp", "") ?? path,
      src as string,
    ]),
  );

const buildLocalGalleryPhotos = (
  images: GalleryAssetMap,
  thumbs: GalleryAssetMap,
  altPrefix: string,
): GalleryPhoto[] =>
  Object.entries(images)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([path, src], index) => {
      const fileName = path.split("/").pop() ?? `${altPrefix}-${index + 1}`;

      return {
        id: fileName,
        image_url: src,
        thumbnail_url: thumbs[fileName] ?? src,
        alt_text: `${altPrefix} - photo ${index + 1}`,
        location: null,
        title: null,
        display_order: index,
      };
    });

const maternityGallery1Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/grossesse/grossesse_1/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/grossesse/grossesse_1/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo maternité à Marseille",
);

const maternityGallery2Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/grossesse/laurie_maternite/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/grossesse/laurie_maternite/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo maternité à Marseille",
);

const familyGallery1Photos = buildLocalGalleryPhotos(
  toAssetMap({
    ...import.meta.glob("../assets/famille/famille_1/*.webp", {
      eager: true,
      import: "default",
    }),
    ...import.meta.glob("../assets/famille/famille_2/*.webp", {
      eager: true,
      import: "default",
    }),
  }),
  toAssetMap({
    ...import.meta.glob("../assets/famille/famille_1/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
    ...import.meta.glob("../assets/famille/famille_2/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  }),
  "Séance photo famille à Marseille",
);

const familyGallery2Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/famille/famille_2/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/famille/famille_2/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo famille à Marseille",
);

const coupleGallery1Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/couple/couple_1/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/couple/couple_1/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo couple à Marseille",
);

const coupleGallery2Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/couple/couple_2/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/couple/couple_2/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo couple à Marseille",
);

const coupleGallery3Photos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/couple/couple_3/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/couple/couple_3/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo couple à Marseille",
);

const portraitGalleryPhotos = buildLocalGalleryPhotos(
  toAssetMap(
    import.meta.glob("../assets/portrait/portrait_1/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/portrait/portrait_1/thumbs/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  "Séance photo portrait à Marseille",
);

const SEO_PAGE_META: Record<
  string,
  {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  }
> = {
  "photographe-grossesse-marseille": {
    title: "Photographe grossesse Marseille — Soleana Studio",
    description:
      "Photographe grossesse à Marseille et alentours. Séances douces et naturelles pour immortaliser votre maternité.",
    ogTitle: "Photographe grossesse à Marseille | Soleana Studio",
    ogDescription: "Immortalisez votre maternité avec une séance douce et lumineuse à Marseille.",
  },
  "photographe-famille-marseille": {
    title: "Photographe famille à Marseille — Soleana Studio",
    description:
      "Photographe famille à Marseille et alentours. Des séances naturelles, lumineuses et pleines de vie pour raconter votre famille telle qu’elle est.",
    ogTitle: "Photographe famille à Marseille | Soleana Studio",
    ogDescription: "Des souvenirs sincères, lumineux et pleins de vie de votre famille.",
  },
  "photographe-couple-marseille": {
    title: "Photographe couple à Marseille — Soleana Studio",
    description:
      "Photographe couple à Marseille et alentours. Séances naturelles et lumineuses pour raconter votre histoire à deux.",
    ogTitle: "Photographe couple à Marseille | Soleana Studio",
    ogDescription: "Des images douces, sincères et lumineuses de votre histoire à deux.",
  },
  "photographe-portrait-marseille": {
    title: "Photographe portrait à Marseille — Soleana Studio",
    description:
      "Photographe portrait à Marseille et alentours. Des séances naturelles, élégantes et sincères pour révéler votre personnalité.",
    ogTitle: "Photographe portrait à Marseille | Soleana Studio",
    ogDescription: "Des portraits naturels, élégants et sincères pour révéler votre personnalité.",
  },
  "photographe-lifestyle-marseille": {
    title: "Photographe lifestyle Marseille — Soleana Studio",
    description:
      "Photographe lifestyle à Marseille. Reportages doux, naturels et lumineux du quotidien.",
    ogTitle: "Photographe lifestyle à Marseille | Soleana Studio",
    ogDescription: "Des reportages doux, naturels et lumineux du quotidien.",
  },
};

const SEO_PAGE_COPY_OVERRIDES: Record<
  string,
  {
    h1?: string;
    intro: string;
    content: string;
  }
> = {
  "photographe-grossesse-marseille": {
    intro: "Garder une trace douce et lumineuse de l’attente la plus précieuse de votre vie.",
    content:
      "Photographe maternité à Marseille et alentours, j’accompagne les futures mamans avec douceur pour créer des images naturelles, sensibles et pleines d’émotion. Sans poses figées, je vous guide simplement pour que vous restiez vous-même, dans un décor qui vous ressemble : calanques, plages, collines de Provence ou lieu plus intime. Mon approche repose sur la lumière naturelle, les gestes tendres et les détails qui racontent déjà votre histoire.",
  },
  "photographe-couple-marseille": {
    h1: "Photographe couple à Marseille",
    intro:
      "Raconter votre histoire à deux, dans ce qu’elle a de plus vrai, de plus tendre et de plus naturel.",
    content:
      "Photographe couple à Marseille et alentours, je vous accompagne pour créer des images douces, sincères et lumineuses de votre relation. Sans poses figées, je vous guide simplement pour laisser place aux gestes naturels, aux regards complices et aux émotions vraies. En bord de mer, dans les calanques, au cœur de la Provence ou dans un lieu qui vous ressemble, chaque séance est pensée comme une parenthèse à deux, fidèle à votre histoire.",
  },
  "photographe-famille-marseille": {
    h1: "Photographe famille à Marseille",
    intro:
      "Garder une trace sincère de votre famille, de ses liens, de ses rires et de ses petits instants précieux.",
    content:
      "Photographe famille à Marseille et alentours, je vous accompagne pour créer des souvenirs naturels, lumineux et pleins de vie. Chaque séance est pensée pour raconter votre famille telle qu’elle est, sans poses forcées ni sourires figés. À la maison, en extérieur, au bord de la mer, dans les collines ou dans un lieu qui compte pour vous, je capture les gestes spontanés, les éclats de rire, les câlins et les détails qui rendent votre histoire unique.",
  },
  "photographe-portrait-marseille": {
    h1: "Photographe portrait à Marseille",
    intro: "Révéler votre personnalité avec douceur, naturel et authenticité.",
    content:
      "Photographe portrait à Marseille et alentours, je vous accompagne pour créer des images naturelles, élégantes et sincères. Une séance portrait est un moment pour vous, pensé pour mettre en valeur votre personnalité, votre regard et ce que vous souhaitez transmettre. Sans poses figées, je vous guide avec bienveillance afin que vous vous sentiez à l’aise, dans une ambiance douce, lumineuse et adaptée à votre univers.",
  },
};

const SEO_PAGE_GALLERY: Record<
  string,
  {
    sections: Array<{
      subtitle: string;
      title: string;
      description: string;
      categorySlugs: string[];
      variant?: "standard" | "single";
      photos?: GalleryPhoto[];
    }>;
  }
> = {
  "photographe-grossesse-marseille": {
    sections: [
      {
        subtitle: "Galerie maternité",
        title: "Quelques instants de douceur",
        description:
          "Découvrez un aperçu de séances grossesse réalisées en lumière naturelle, entre gestes tendres, émotions sincères et souvenirs précieux.",
        categorySlugs: [],
        variant: "single",
        photos: maternityGallery1Photos,
      },
      {
        subtitle: "Galerie maternité",
        title: "Quelques instants de douceur",
        description:
          "Découvrez un aperçu de séances grossesse réalisées en lumière naturelle, entre gestes tendres, émotions sincères et souvenirs précieux.",
        categorySlugs: [],
        variant: "single",
        photos: maternityGallery2Photos,
      },
    ],
  },
  "photographe-famille-marseille": {
    sections: [
      {
        subtitle: "Galerie famille",
        title: "Des souvenirs vrais et lumineux",
        description:
          "Découvrez un aperçu de séances famille réalisées en lumière naturelle, entre rires, tendresse, complicité et moments de vie spontanés.",
        categorySlugs: [],
        variant: "single",
        photos: familyGallery1Photos,
      },
      {
        subtitle: "Galerie famille",
        title: "Des souvenirs vrais et lumineux",
        description:
          "Découvrez un aperçu de séances famille réalisées en lumière naturelle, entre rires, tendresse, complicité et moments de vie spontanés.",
        categorySlugs: [],
        variant: "single",
        photos: familyGallery2Photos,
      },
    ],
  },
  "photographe-couple-marseille": {
    sections: [
      {
        subtitle: "Galerie couple",
        title: "Des liens, des gestes, des regards",
        description:
          "Découvrez un aperçu de séances couple réalisées en lumière naturelle, entre gestes spontanés, regards complices et instants simples qui racontent votre histoire à deux avec douceur.",
        categorySlugs: [],
        variant: "single",
        photos: coupleGallery1Photos,
      },
      {
        subtitle: "Galerie couple",
        title: "Des liens, des gestes, des regards",
        description:
          "Découvrez un aperçu de séances couple réalisées en lumière naturelle, entre gestes spontanés, regards complices et instants simples qui racontent votre histoire à deux avec douceur.",
        categorySlugs: [],
        variant: "single",
        photos: coupleGallery2Photos,
      },
      {
        subtitle: "Galerie couple",
        title: "Des liens, des gestes, des regards",
        description:
          "Découvrez un aperçu de séances couple réalisées en lumière naturelle, entre gestes spontanés, regards complices et instants simples qui racontent votre histoire à deux avec douceur.",
        categorySlugs: [],
        variant: "single",
        photos: coupleGallery3Photos,
      },
    ],
  },
  "photographe-portrait-marseille": {
    sections: [
      {
        subtitle: "Galerie portrait",
        title: "Des portraits naturels et sensibles",
        description:
          "Découvrez un aperçu de séances portrait réalisées en lumière naturelle, avec une approche douce, authentique et personnalisée.",
        categorySlugs: [],
        variant: "single",
        photos: portraitGalleryPhotos,
      },
    ],
  },
  "photographe-lifestyle-marseille": { sections: [] },
};

export const Route = createFileRoute("/$slug")({
  head: ({ params }) => {
    const meta = SEO_PAGE_META[params.slug] ?? {
      title: "Photographe à Marseille — Soleana Studio",
      description: "Photographe lifestyle à Marseille et alentours.",
      ogTitle: "Soleana Studio — Photographe lifestyle Marseille",
      ogDescription: "Des souvenirs doux, vrais et lumineux.",
    };

    return buildPageSeo({
      title: meta.title,
      description: meta.description,
      path: `/${params.slug}`,
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
    });
  },
  component: SeoPage,
  errorComponent: ({ error }) => (
    <SiteShell>
      <div className="px-6 pt-40 pb-32 text-center">
        <p>Erreur : {error.message}</p>
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="px-6 pt-40 pb-32 text-center">
        <h1 className="font-display text-3xl italic">Page introuvable</h1>
      </div>
    </SiteShell>
  ),
});

function SeoPage() {
  const { slug } = Route.useParams();
  const gallery = SEO_PAGE_GALLERY[slug];
  const hasMultipleGalleries = (gallery?.sections.length ?? 0) > 1;
  const { data: page, isLoading } = useQuery({
    queryKey: ["seo", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_pages")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading || !page) {
    return (
      <SiteShell>
        <div className="px-6 pt-40 pb-32 text-center text-muted-foreground">Chargement…</div>
      </SiteShell>
    );
  }

  const copyOverride = SEO_PAGE_COPY_OVERRIDES[slug];
  const displayPage = copyOverride ? { ...page, ...copyOverride } : page;
  const displayTitle = copyOverride?.h1 ?? page.h1;
  const gallerySections = gallery?.sections.map((section, index) => ({
    ...section,
    description: hasMultipleGalleries && index > 0 ? undefined : section.description,
  }));
  const primaryGallerySection = gallerySections?.[0];

  return (
    <SiteShell>
      <section className="px-5 pb-12 pt-32 text-center sm:px-6 sm:pb-16 sm:pt-36 md:pt-40">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
            Soleana Studio
          </p>
          <h1 className="font-display text-4xl md:text-6xl italic text-primary leading-tight mx-auto max-w-4xl">
            {displayTitle}
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-8 mx-auto max-w-2xl text-lg leading-relaxed italic text-muted-foreground">
            « {displayPage.intro} »
          </p>
        </Reveal>
      </section>

      <section className="px-5 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="prose prose-lg mx-auto max-w-3xl whitespace-pre-line leading-relaxed text-foreground">
              {displayPage.content}
            </div>
          </Reveal>

          {hasMultipleGalleries ? (
            <div className="mt-12 rounded-[32px] border border-border/70 bg-surface/70 p-6 shadow-[0_24px_70px_-50px_rgba(62,47,40,0.28)] md:p-8">
              {primaryGallerySection && (
                <Reveal>
                  <div className="mx-auto max-w-3xl text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                      {primaryGallerySection.subtitle}
                    </p>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl italic text-primary leading-tight text-balance">
                      {primaryGallerySection.title}
                    </h2>
                    {primaryGallerySection.description && (
                      <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground text-pretty">
                        {primaryGallerySection.description}
                      </p>
                    )}
                  </div>
                </Reveal>
              )}
              <div className="space-y-12 md:space-y-14">
                {gallerySections?.map((section, index) => (
                  <Reveal key={`${slug}-${index}`} delay={120 + index * 60}>
                    <CategoryGallerySection
                      categorySlugs={section.categorySlugs}
                      subtitle={section.subtitle}
                      title={section.title}
                      description={section.description}
                      showHeader={false}
                      variant={section.variant}
                      photos={section.photos}
                      id={`gallery-${slug}-${index + 1}`}
                      compact
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            gallery?.sections.map((section, index) => (
              <Reveal key={`${slug}-${index}`} delay={120 + index * 60}>
                <CategoryGallerySection
                  categorySlugs={section.categorySlugs}
                  subtitle={section.subtitle}
                  title={section.title}
                  description={section.description}
                  variant={section.variant}
                  photos={section.photos}
                  id={`gallery-${slug}-${index + 1}`}
                />
              </Reveal>
            ))
          )}

          <Reveal className="mt-16 text-center">
            <Link
              to="/contact"
              className="inline-block bg-[#C6966F] px-10 py-4 text-[11px] uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#b8845f]"
            >
              {page.cta_label}
            </Link>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
