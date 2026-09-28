import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { CategoryGallerySection } from "@/components/site/CategoryGallerySection";
import { buildPageSeo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { loadStorageGalleries, STORAGE_GALLERIES_ENABLED } from "@/lib/photo-storage";

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
    import.meta.glob("../assets/grossesse/maternite_2/*.webp", {
      eager: true,
      import: "default",
    }),
  ),
  toAssetMap(
    import.meta.glob("../assets/grossesse/maternite_2/thumbs/*.webp", {
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
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("seo_pages")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      console.error(`[seo_pages] Échec du chargement de la page "${params.slug}":`, error);
      throw new Error("Erreur de chargement de la page");
    }
    if (!data) throw notFound();
    // Galeries lues depuis Supabase Storage : inactif tant que STORAGE_GALLERIES_ENABLED est faux
    // (le site garde alors les fichiers locaux, sans requête supplémentaire ni donnée en plus).
    if (STORAGE_GALLERIES_ENABLED && SEO_PAGE_GALLERY[params.slug]?.sections.length) {
      return { ...data, storageGalleries: await loadStorageGalleries(data.id) };
    }
    return data;
  },
  head: ({ params, loaderData, match }) => {
    if (!loaderData) {
      if (match.status === "notFound") {
        return {
          meta: [
            { title: "Page introuvable — Soleana Studio" },
            { name: "robots", content: "noindex" },
          ],
        };
      }
      return {
        meta: [{ title: "Soleana Studio" }, { name: "robots", content: "noindex" }],
      };
    }

    return buildPageSeo({
      title: loaderData.meta_title,
      description: loaderData.meta_description,
      path: `/${params.slug}`,
      ogTitle: loaderData.og_title ?? loaderData.meta_title,
      ogDescription: loaderData.og_description ?? loaderData.meta_description,
    });
  },
  component: SeoPage,
  errorComponent: ({ error }) => {
    console.error(error);
    return (
      <SiteShell>
        <div className="px-6 pt-40 pb-32 text-center">
          <h1 className="font-display text-3xl italic">Page momentanément indisponible</h1>
          <p className="mt-4">
            Cette page est momentanément indisponible, merci de réessayer dans quelques instants.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-[#C6966F] px-8 py-3 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#b8845f]"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </SiteShell>
    );
  },
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
  const page = Route.useLoaderData();
  const gallery = SEO_PAGE_GALLERY[slug];
  const hasMultipleGalleries = (gallery?.sections.length ?? 0) > 1;

  const storageGalleries = "storageGalleries" in page ? page.storageGalleries : null;

  const gallerySections = gallery?.sections.map((section, index) => {
    // L'activation est faite uniquement après l'import complet. Ensuite, l'admin peut ajouter,
    // retirer ou dépublier des photos : la longueur de la galerie doit pouvoir changer.
    // Une erreur de lecture renvoie null et conserve les fichiers locaux.
    const stored = storageGalleries?.[`gallery-${index + 1}`] ?? [];
    return {
      ...section,
      photos: storageGalleries ? stored : section.photos,
      description: hasMultipleGalleries && index > 0 ? undefined : section.description,
    };
  });
  const primaryGallerySection = gallerySections?.[0];

  return (
    <SiteShell>
      <section className="px-5 pb-12 pt-32 text-center sm:px-6 sm:pb-16 sm:pt-36 md:pt-40">
        <Reveal immediate>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
            Soleana Studio
          </p>
          <h1 className="font-display text-4xl md:text-6xl italic text-primary leading-tight mx-auto max-w-4xl break-words">
            {page.h1}
          </h1>
        </Reveal>
        <Reveal immediate>
          <p className="mt-8 mx-auto max-w-2xl text-lg leading-relaxed italic text-muted-foreground">
            « {page.intro} »
          </p>
        </Reveal>
      </section>

      <section className="px-5 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <Reveal immediate>
            <div className="prose prose-lg mx-auto max-w-3xl whitespace-pre-line break-words leading-relaxed text-foreground">
              {page.content}
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
            gallerySections?.map((section, index) => (
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
