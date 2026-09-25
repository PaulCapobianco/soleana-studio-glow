import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import { NoelGallery } from "@/components/site/NoelGallery";
import { absoluteUrl, buildPageSeo } from "@/lib/seo";
import { getNoel2026EditionState } from "@/lib/noel-2026.functions";
import {
  NOEL_2026_ACTIVE_HERO,
  NOEL_2026_COLORS,
  NOEL_2026_FAQ,
  NOEL_2026_FORMULES,
  NOEL_2026_GALLERY_PHOTOS,
  NOEL_2026_LOCATION,
  NOEL_2026_SESSION_DATES,
  NOEL_2026_TEXTS,
  NOEL_2026_SEO,
  NOEL_2026_PAGE_COPY,
} from "@/data/noel-2026";

export const Route = createFileRoute("/mini-seances-noel-2026")({
  loader: () => getNoel2026EditionState(),
  head: () => {
    const seo = buildPageSeo(NOEL_2026_SEO);

    return {
      ...seo,
      meta: [
        ...seo.meta,
        { property: "og:image", content: absoluteUrl(NOEL_2026_ACTIVE_HERO.src1600) },
      ],
    };
  },
  component: NoelPage,
});

function NoelPage() {
  const { isEditionOver } = Route.useLoaderData();

  if (isEditionOver) {
    return (
      <SiteShell>
        <section className="px-6 pt-40 pb-32 text-center">
          <Reveal>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.4em] mb-4"
              style={{ color: NOEL_2026_COLORS.deepRed }}
            >
              {NOEL_2026_PAGE_COPY.editionStatus}
            </p>
            <h1 className="font-display text-4xl md:text-5xl italic text-primary mb-6">
              {NOEL_2026_TEXTS.heroTitle}
            </h1>
            <p className="mb-4 text-lg">{NOEL_2026_TEXTS.editionOverTitle}</p>
            <p className="max-w-xl mx-auto text-foreground/90 text-lg leading-relaxed mb-10">
              {NOEL_2026_TEXTS.editionOverText}
            </p>
            <Link
              to="/prestations"
              className="inline-flex items-center justify-center px-8 py-3 text-xs uppercase tracking-widest text-white transition-colors"
              style={{ backgroundColor: NOEL_2026_COLORS.pineGreen }}
            >
              {NOEL_2026_TEXTS.editionOverButton}
            </Link>
          </Reveal>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="relative w-full">
          <img
            src={NOEL_2026_ACTIVE_HERO.src}
            srcSet={`${NOEL_2026_ACTIVE_HERO.src} 800w, ${NOEL_2026_ACTIVE_HERO.src1600} 1600w, ${NOEL_2026_ACTIVE_HERO.src2400} 2400w`}
            sizes="100vw"
            alt={NOEL_2026_ACTIVE_HERO.alt}
            width={2400}
            height={1600}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: NOEL_2026_ACTIVE_HERO.objectPosition }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/10" />
          <div className="relative px-6 pb-16 pt-40 text-center sm:pb-20 sm:pt-44 lg:py-44">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/80 mb-4">
                Soleana Studio
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl italic text-white leading-tight mx-auto max-w-3xl">
                {NOEL_2026_TEXTS.heroTitle}
              </h1>
              <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg italic text-white/90">
                {NOEL_2026_TEXTS.heroSubtitle}
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-white/80">
                {NOEL_2026_TEXTS.heroDatesLabel} — {NOEL_2026_LOCATION}
              </p>
              <a
                href="#formules"
                className="mt-10 inline-flex items-center justify-center px-8 py-3 text-xs uppercase tracking-widest text-white transition-colors"
                style={{ backgroundColor: NOEL_2026_COLORS.pineGreen }}
              >
                {NOEL_2026_TEXTS.heroCta}
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* EXPÉRIENCE */}
      <section className="px-6 py-24 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            {NOEL_2026_TEXTS.experience.map((paragraph) => (
              <p
                key={paragraph}
                className="text-lg leading-relaxed text-foreground/90 mb-6 last:mb-0"
              >
                {paragraph}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* GALERIE */}
      <section className="px-6 pb-24 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-sm italic text-muted-foreground mb-10">
              {NOEL_2026_TEXTS.galleryMention}
            </p>
          </Reveal>
          <NoelGallery photos={NOEL_2026_GALLERY_PHOTOS} />
        </div>
      </section>

      {/* DÉROULEMENT */}
      <section className="px-6 py-24 md:py-28" style={{ backgroundColor: "var(--surface)" }}>
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic text-primary text-center mb-12">
              {NOEL_2026_PAGE_COPY.experienceTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {NOEL_2026_PAGE_COPY.experienceItems.map((item) => (
                <div key={item} className="rounded-[24px] border border-border bg-background p-5">
                  <p className="text-sm leading-relaxed text-foreground/88">{item}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FORMULES */}
      <section id="formules" className="scroll-mt-28 px-6 py-24 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic text-primary text-center mb-4">
              {NOEL_2026_PAGE_COPY.formulesTitle}
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-14">
              {NOEL_2026_PAGE_COPY.formulesIntro}
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {NOEL_2026_FORMULES.map((formule, i) => (
              <Reveal key={formule.id} delay={i * 80}>
                <div className="flex h-full flex-col border border-border bg-surface p-8 lg:p-10">
                  <h3 className="font-display text-2xl italic text-primary mb-1">{formule.name}</h3>
                  <p
                    className="font-mono text-2xl mb-6"
                    style={{ color: NOEL_2026_COLORS.deepRed }}
                  >
                    {formule.priceEur} €
                  </p>
                  <ul className="text-sm text-foreground/85 space-y-3 border-t border-border pt-6 flex-1">
                    {formule.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span style={{ color: NOEL_2026_COLORS.pineGreen }}>·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={formule.pelliUrl}
                    target="_blank"
                    rel="noopener"
                    className="mt-8 inline-flex items-center justify-center px-6 py-3 text-xs uppercase tracking-widest text-white transition-colors"
                    style={{ backgroundColor: NOEL_2026_COLORS.pineGreen }}
                  >
                    {NOEL_2026_PAGE_COPY.formuleCta}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DATES */}
      <section className="px-6 py-24 md:py-28" style={{ backgroundColor: "var(--surface)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic text-primary mb-10">
              {NOEL_2026_PAGE_COPY.datesTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {NOEL_2026_SESSION_DATES.map((d) => (
                <div key={d.iso} className="border border-border bg-background p-6">
                  <p className="font-display text-xl italic text-primary">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              {NOEL_2026_PAGE_COPY.limitedPlaces}
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic text-primary text-center mb-12">
              {NOEL_2026_PAGE_COPY.faqTitle}
            </h2>
            <div className="space-y-8">
              {NOEL_2026_FAQ.map((item) => (
                <div key={item.question}>
                  <h3 className="font-display text-lg italic text-primary mb-2">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-foreground/85">{item.answer}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-6 py-28 md:py-32 overflow-hidden">
        <img
          src={NOEL_2026_GALLERY_PHOTOS[NOEL_2026_GALLERY_PHOTOS.length - 1].srcLarge}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto max-w-2xl text-center text-white">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic mb-8">
              {NOEL_2026_TEXTS.ctaFinalTitle}
            </h2>
            <a
              href="#formules"
              className="inline-flex items-center justify-center px-10 py-4 text-xs uppercase tracking-widest text-white transition-colors"
              style={{ backgroundColor: NOEL_2026_COLORS.pineGreen }}
            >
              {NOEL_2026_TEXTS.ctaFinalButton}
            </a>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
