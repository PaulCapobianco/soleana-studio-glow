import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Heart, Instagram, Sparkles } from "lucide-react";

import aboutPortrait from "@/assets/a_propos/portrait_2.webp";
import fiancaille1 from "@/assets/a_propos/fiancaille_1.webp";
import couple1 from "@/assets/a_propos/couple_1.webp";
import couple2 from "@/assets/a_propos/couple_2.webp";
import famille1 from "@/assets/a_propos/famille_1.webp";
import landscape2 from "@/assets/a_propos/paysage_2.webp";
import maternite1 from "@/assets/a_propos/maternite_1.webp";
import couple3 from "@/assets/a_propos/couple_3.webp";
import heroBanner from "@/assets/a_propos/portrait_3.webp";
import instagramMark from "@/assets/logo-soleana-icon.png";
import { Reveal } from "@/components/site/Reveal";
import { SiteShell } from "@/components/site/SiteShell";
import { buildPageSeo } from "@/lib/seo";
import { useSiteSettings } from "@/lib/site-settings";

const photographyNotes = [
  {
    icon: Camera,
    title: "Ce que j'aime photographier",
    text: "Les gestes spontanés, les regards complices, les instants où la lumière enveloppe la scène sans l'écraser.",
  },
  {
    icon: Sparkles,
    title: "Ce qui m'inspire",
    text: "Les matières douces, les paysages de Provence, les intérieurs chaleureux et les histoires vraies plutôt que les poses parfaites.",
  },
  {
    icon: Heart,
    title: "Ce que je cherche à transmettre",
    text: "Des images naturelles, lumineuses et sincères, qui ressemblent à ceux qui les vivent.",
  },
];

type CollageItem = {
  src: string;
  alt: string;
  className: string;
  aspectClassName: string;
  imageClassName?: string;
  // Not set by any item below — every collage tile currently keeps the
  // default hover-zoom + gradient overlay. Kept as opt-outs for a future
  // item that shouldn't animate or darken on hover.
  disableHoverZoom?: boolean;
  noOverlay?: boolean;
};

const collageItems: CollageItem[] = [
  {
    src: landscape2,
    alt: "Séance lifestyle lumineuse en extérieur",
    className: "md:col-start-1 md:col-span-4 md:row-start-1 md:row-span-6",
    aspectClassName: "aspect-[4/5] md:aspect-auto",
    imageClassName: "filter-none",
  },
  {
    src: fiancaille1,
    alt: "Portrait naturel en lumière douce",
    className: "md:col-start-5 md:col-span-4 md:row-start-1 md:row-span-4",
    aspectClassName: "aspect-[3/4] md:aspect-auto",
  },
  {
    src: couple1,
    alt: "Détails d'une séance photo en Provence",
    className: "md:z-20 md:col-start-9 md:col-span-4 md:row-start-1 md:row-span-4",
    aspectClassName: "aspect-[3/4] md:aspect-auto",
  },
  {
    src: famille1,
    alt: "Portrait éditorial d'une séance photo lifestyle",
    className: "md:z-10 md:col-start-5 md:col-span-8 md:row-start-5 md:row-span-3",
    aspectClassName: "aspect-[16/9] md:aspect-auto",
    imageClassName: "object-[center_100%]",
  },
  {
    src: couple2,
    alt: "Instant de complicité lors d'une séance photo",
    className: "md:col-start-1 md:col-span-4 md:row-start-7 md:row-span-3",
    aspectClassName: "aspect-square md:aspect-auto",
  },
  {
    src: maternite1,
    alt: "Ambiance douce et naturelle d'un shooting à Marseille",
    className: "md:col-start-5 md:col-span-8 md:row-start-8 md:row-span-2",
    aspectClassName: "aspect-[3/2] md:aspect-auto",
  },
];

const instagramCards = [
  {
    cover: fiancaille1,
    alt: "Séance photo naturelle en bord de mer sur Instagram",
    permalink: "https://www.instagram.com/p/DVwHKFkCI3a/?utm_source=ig_embed&utm_campaign=loading",
  },
  {
    cover: couple3,
    alt: "Instant de complicité capturé lors d'une séance photo Instagram",
    permalink: "https://www.instagram.com/p/DO89SHMCFoh/?utm_source=ig_embed&utm_campaign=loading",
  },
  {
    cover: maternite1,
    alt: "Séance photo douce et lumineuse partagée sur Instagram",
    permalink:
      "https://www.instagram.com/reel/DWwiKP-o7O0/?utm_source=ig_embed&utm_campaign=loading",
  },
];

const instagramHandle = "@soleana.studio";

export const Route = createFileRoute("/a-propos")({
  head: () =>
    buildPageSeo({
      title: "À propos de Soleana Studio | Photographe à Marseille",
      description:
        "Découvrez Anaïs, photographe lifestyle à Marseille, son histoire, son univers naturel et lumineux, et sa manière de raconter les émotions à travers l'image.",
      path: "/a-propos",
      ogTitle: "À propos de Soleana Studio",
      ogDescription:
        "Découvrez l'univers doux, naturel et lumineux de Soleana Studio, photographe lifestyle à Marseille.",
    }),
  component: About,
});

function About() {
  const { instagramUrl } = useSiteSettings();
  return (
    <SiteShell>
      <section className="relative overflow-hidden px-6 pt-32 pb-16 sm:pt-36 sm:pb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(200,155,123,0.12),_transparent_45%)]" />
        <div className="absolute left-1/2 top-10 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#C6966F]/10 blur-3xl" />

        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <article className="relative min-h-[420px] overflow-hidden rounded-[36px] border border-border bg-surface shadow-[0_30px_90px_-58px_rgba(62,47,40,0.45)] sm:min-h-[540px]">
                <img
                  src={heroBanner}
                  alt="Atmosphère douce et lumineuse de Soleana Studio"
                  width={1600}
                  height={1200}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-10 lg:p-12">
                  <h1 className="mt-3 max-w-3xl font-display text-5xl italic leading-[0.95] text-white [text-shadow:0_3px_18px_rgba(0,0,0,0.7)] sm:text-6xl lg:text-7xl">
                    À propos de moi
                  </h1>
                  <div className="mt-6 h-px w-20 bg-gradient-to-r from-white/80 to-transparent" />
                  <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/90 [text-shadow:0_3px_16px_rgba(0,0,0,0.65)] sm:text-lg">
                    <strong>
                      Derrière Soleana Studio, il y a Anaïs, une photographe guidée par la lumière,
                      les émotions et les souvenirs vrais.
                    </strong>
                  </p>
                </div>
              </article>

              <div className="grid gap-6">
                <div className="rounded-[32px] border border-border bg-surface p-6 sm:p-8 lg:p-10">
                  <p className="font-display text-2xl italic leading-tight text-primary sm:text-3xl">
                    Des instants vrais, racontés en lumière
                  </p>
                  <p className="mt-5 text-lg leading-relaxed text-foreground">
                    Photographe des moments de vie à Marseille, je capture les liens, les émotions
                    et les instants vrais avec douceur et lumière naturelle.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["Lumière naturelle", "Émotions sincères", "Instants précieux"].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#C6966F]/30 bg-[#C6966F]/8 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#8A5A44]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-border bg-background p-6 sm:p-8 lg:p-9">
                  <p className="font-display text-2xl italic leading-tight text-primary sm:text-3xl">
                    Une séance pensée pour vous
                  </p>
                  <blockquote className="mt-4 border-l-2 border-[#C6966F] pl-5 font-display text-2xl italic leading-snug text-foreground">
                    « Je crois aux photos qui, vingt ans plus tard, vous feront encore monter une
                    larme. »
                  </blockquote>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    Chaque séance commence bien avant le déclenchement : un appel, des conseils et
                    un lieu choisi ensemble pour que vous vous sentiez pleinement vous-même.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:gap-14">
          <Reveal className="lg:sticky lg:top-28 h-full self-stretch">
            <figure className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_28px_80px_-56px_rgba(62,47,40,0.45)]">
              <img
                src={aboutPortrait}
                alt="Soleana, photographe lifestyle à Marseille"
                width={1200}
                height={1500}
                className="min-h-0 flex-1 w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </Reveal>

          <Reveal delay={120}>
            <article className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-8 shadow-[0_28px_80px_-56px_rgba(62,47,40,0.28)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div className="absolute right-0 top-0 h-44 w-44 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6966F]/10 blur-3xl" />
              <div className="relative space-y-8">
                <div className="space-y-3">
                  <p className="font-display text-2xl italic leading-tight text-primary sm:text-3xl">
                    De mes premiers souvenirs à vos histoires
                  </p>
                  <div className="grid gap-6">
                    <p className="max-w-2xl font-sans text-[16px] leading-[1.85] text-muted-foreground">
                      Si vous êtes ici, c&apos;est sûrement que mon univers vous parle. Alors je me
                      lance !
                    </p>

                    <p className="max-w-2xl font-sans text-[16px] leading-[1.85] text-muted-foreground">
                      Je m&apos;appelle Anaïs, j&apos;ai 31 ans, et en y repensant, la photo a
                      toujours fait partie de moi. Mon tout premier appareil était un jetable, celui
                      qu&apos;on portait à développer sans jamais savoir si les images étaient
                      réussies… C&apos;était ça, la magie. À chaque sortie d&apos;école ou départ en
                      vacances, j&apos;en avais un. Je capturais tout ce qui comptait pour moi, et
                      je garde encore précieusement les petits albums de ces années-là.
                    </p>

                    <p className="max-w-2xl font-sans text-[16px] leading-[1.85] text-muted-foreground">
                      À 15 ans, j&apos;ai eu mon premier appareil numérique compact. Il
                      m&apos;accompagnait partout : au lycée, avec mes amies, dans chaque moment
                      important. Jusqu&apos;au jour où je me suis assise sur mon sac… écran brisé,
                      cœur brisé. J&apos;ai alors économisé pour en racheter un. Et souvent,
                      j&apos;empruntais celui de mes parents, plus performant. C&apos;est à ce
                      moment-là que tout a changé : j&apos;ai commencé à vouloir raconter des
                      histoires, mettre en lumière des gens, des lieux, des émotions.
                    </p>

                    <p className="max-w-2xl font-sans text-[16px] leading-[1.85] text-muted-foreground">
                      Pendant longtemps, j&apos;ai surtout photographié la nature et les paysages,
                      comme un carnet de voyage visuel. Puis, vers mes 20 ans, j&apos;ai découvert
                      le portrait. J&apos;ai commencé avec mes proches, pour des instants qui
                      comptaient, et j&apos;ai tout de suite adoré. Même en photographiant juste
                      pour moi, j&apos;avais toujours cette envie d&apos;apprendre et de progresser.
                    </p>

                    <p className="max-w-2xl font-sans text-[16px] leading-[1.85] text-muted-foreground">
                      Aujourd&apos;hui, j&apos;ai décidé de faire un pas de plus : raconter votre
                      histoire. Capturer, créer, sublimer les moments qui marquent votre vie. Je
                      n&apos;ai pas étudié la photographie, mais je photographie avec le cœur, et
                      c&apos;est ce qui guide tout mon travail.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-8 text-center">
            <h2 className="mx-auto max-w-3xl font-display text-4xl italic leading-[1.02] tracking-tight text-primary sm:text-5xl md:text-6xl">
              Ma façon de raconter vos histoires
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Des paysages, des lumières, des instants simples et des détails qui inspirent ma façon
              de raconter vos histoires en images.
            </p>
          </Reveal>

          <div className="rounded-[32px] border border-border bg-surface/60 p-3 shadow-[0_28px_80px_-56px_rgba(62,47,40,0.18)] sm:p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:auto-rows-[100px] md:grid-cols-12 md:gap-3 md:grid-flow-dense">
              {collageItems.map((item) => (
                <figure
                  key={item.src}
                  className={`group isolate relative min-h-[140px] overflow-hidden rounded-[22px] border border-border bg-muted shadow-[0_18px_52px_-42px_rgba(62,47,40,0.32)] ${item.className} ${item.aspectClassName}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1200}
                    height={1200}
                    className={`relative z-0 block h-full w-full object-cover object-center ${
                      item.disableHoverZoom
                        ? ""
                        : "transition-transform duration-700 ease-out md:group-hover:scale-[1.04]"
                    } ${item.imageClassName ?? ""}`}
                    loading="lazy"
                    decoding="async"
                  />
                  {!item.noOverlay ? (
                    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-foreground/15 via-transparent to-transparent opacity-0 transition-opacity duration-500 md:group-hover:opacity-100" />
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-2 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-2">
          <Reveal className="order-1 lg:order-1 h-full">
            <article className="relative h-full overflow-hidden rounded-[36px] border border-border bg-[linear-gradient(180deg,#FFFDF8_0%,#FAF6EF_100%)] p-6 shadow-[0_28px_80px_-56px_rgba(62,47,40,0.24)] sm:p-8 lg:min-h-[780px] lg:p-10">
              <div className="absolute right-0 top-0 h-44 w-44 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6966F]/10 blur-3xl" />
              <div className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-[#C6966F] via-[#D8A15D]/70 to-transparent" />
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
                Anaïs &amp; la photographie
              </p>
              <h2 className="mt-4 max-w-lg font-display text-4xl italic leading-[0.95] text-balance text-primary sm:text-5xl lg:text-6xl">
                Photographier ce qui est vrai
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">
                Trois repères simples pour comprendre ce qui guide mon regard, mon rythme et ma
                manière de raconter une séance.
              </p>
              <div className="mt-8 grid gap-4">
                {photographyNotes.map((note) => (
                  <section
                    key={note.title}
                    className="rounded-[24px] border border-[#E8DCCF] bg-surface/80 p-4 shadow-[0_16px_40px_-34px_rgba(62,47,40,0.22)] sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8DCCF] bg-[#FAF6EF] text-[#8A5A44] shadow-[0_10px_24px_-18px_rgba(62,47,40,0.28)]">
                        <note.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="space-y-2">
                        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8A5A44]">
                          {note.title}
                        </h3>
                        <p className="leading-relaxed text-muted-foreground">{note.text}</p>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal className="order-2 lg:order-2 h-full" delay={120}>
            <div className="flex h-full">
              <figure className="group relative h-full min-h-[780px] w-full overflow-hidden rounded-[30px] border border-border bg-muted shadow-[0_26px_70px_-46px_rgba(62,47,40,0.35)]">
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/8 via-transparent to-transparent opacity-0 transition-opacity duration-500 md:group-hover:opacity-100" />
                <img
                  src={couple3}
                  alt="Instant de séance photo rempli d'émotion"
                  width={1200}
                  height={1200}
                  className="block h-full w-full object-cover object-center transition-transform duration-700 ease-out md:group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
              Instagram
            </p>
            <h2 className="font-display text-4xl italic text-primary sm:text-5xl">
              Suivez-moi sur Instagram !
            </h2>
            <p className="mt-4 text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {instagramHandle}
            </p>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {instagramCards.map((post, index) => (
              <Reveal key={post.permalink} delay={index * 100}>
                <article className="flex h-full overflow-hidden rounded-[28px] border border-border bg-surface p-3 shadow-[0_20px_70px_-50px_rgba(62,47,40,0.45)]">
                  <div className="flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-white">
                    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/70 bg-[#FAF6EF] p-[2px]">
                          <img
                            src={instagramMark}
                            alt=""
                            className="h-full w-full rounded-full object-cover object-center"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="truncate font-semibold text-sm text-foreground">
                            soleana.studio
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            Marseille, France
                          </p>
                        </div>
                      </div>
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-md bg-[#0095F6] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#0081d1]"
                        aria-label="Voir le profil Instagram de Soleana Studio"
                      >
                        Voir le profil
                      </a>
                    </div>

                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block flex-1 overflow-hidden bg-[#FAF6EF]"
                      aria-label={`Ouvrir la publication Instagram de Soleana Studio`}
                    >
                      <img
                        src={post.cover}
                        alt={post.alt}
                        className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
                    </a>

                    <div className="border-t border-border/60 px-4 py-3">
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[#0095F6] transition hover:text-[#0081d1]"
                      >
                        Voir plus sur Instagram
                      </a>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 text-center">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C6966F] px-8 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#b8845f]"
            >
              <Instagram className="h-4 w-4" />
              Voir sur Instagram
            </a>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
              Et après ?
            </p>
            <h2 className="font-display text-4xl italic text-primary sm:text-5xl">
              Parlons de votre séance
            </h2>
            <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-muted-foreground">
              Si vous aimez les images douces, naturelles et sincères, je serais ravie d&apos;en
              parler avec vous.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/prestations"
                className="inline-flex items-center justify-center rounded-full border border-[#C6966F] bg-background px-8 py-3 text-sm uppercase tracking-[0.3em] text-[#C6966F] transition hover:bg-[#C6966F] hover:text-white"
              >
                Voir les tarifs
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full bg-[#C6966F] px-8 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#b8845f]"
              >
                Réserver ma séance photo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
