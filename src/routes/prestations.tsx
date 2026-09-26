import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import fondPresta from "@/assets/fond_presta.webp";
import { buildPageSeo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/prestations")({
  loader: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error) {
      console.error("[prestations] Failed to load public content", error);
      throw new Error("Le contenu est momentanément indisponible.");
    }
    return data ?? [];
  },
  head: () =>
    buildPageSeo({
      title: "Prestations & Tarifs — Soleana Studio",
      description:
        "Découvrez les prestations photo Soleana Studio à Marseille : accompagnement personnalisé, appel préparatoire, galerie privée et formules portrait, couple, maternité et famille.",
      path: "/prestations",
      ogTitle: "Prestations & Tarifs — Soleana Studio",
      ogDescription:
        "Prestations photo à Marseille avec accompagnement, préparation de séance et galerie privée en ligne.",
    }),
  component: Tarifs,
});

function Tarifs() {
  const services = Route.useLoaderData();

  return (
    <SiteShell>
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${fondPresta})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#FAF6EF]/66" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#FAF6EF]/10 via-[#FAF6EF]/18 to-[#FAF6EF]/82"
          aria-hidden="true"
        />

        <section className="relative px-6 pt-40 pb-24 text-center">
          <div className="mx-auto max-w-5xl">
            <Reveal immediate>
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                Prestations
              </p>
              <h1 className="font-display text-5xl md:text-6xl italic text-primary mb-6">
                Votre séance photo à Marseille
              </h1>
              <p className="max-w-2xl mx-auto text-foreground/90 text-lg leading-relaxed">
                Ce ne sont pas simplement des images, c’est votre héritage. Chaque séance photo est
                pensée comme une expérience à part entière, avec un accompagnement personnalisé du
                premier échange jusqu’à la livraison finale.
              </p>
            </Reveal>

            <div className="mt-10">
              <Reveal>
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                  Tarifs séances photo extérieur
                </p>
                <h2 className="font-display text-3xl md:text-4xl italic text-primary mb-6">
                  Portrait - Couple - Maternité - Famille - Baptême - Anniversaire - Mariage
                </h2>
                <p className="text-foreground/90 text-lg leading-relaxed max-w-3xl mx-auto">
                  Tout est pensé pour que vous profitiez pleinement du moment, en bord de mer, dans
                  la nature ou dans un lieu adapté à votre séance.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="relative px-6 pb-24">
          <div className="mx-auto grid max-w-7xl items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <div className="flex h-full flex-col rounded-[32px] border border-border bg-surface/100 p-8 shadow-[0_22px_70px_-48px_rgba(62,47,40,0.24)] backdrop-blur-[1px] lg:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">
                  L'accompagnement
                </p>
                <h2 className="font-display text-3xl md:text-4xl italic text-primary mb-6">
                  Une préparation pensée pour vous
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  L’accompagnement et la préparation de votre shooting comprennent nos échanges
                  avant et après la séance, mes conseils personnalisés, ma disponibilité par message
                  WhatsApp jusqu’au jour de la séance pour répondre à vos questions ainsi que le
                  choix du lieu.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    "Appel visio ou téléphonique de 20 à 30 minutes avant la séance pour faire connaissance et vous expliquer le déroulé.",
                    "Déplacement jusqu’à 30 km inclus, puis 1 €/km au-delà.",
                    "Sélection des plus belles images par mes soins.",
                    "Galerie privée en ligne pour choisir vos photos comprises dans la formule, avec possibilité d'en acheter en supplément.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[24px] border border-[#E8DCCF] bg-[#FFFDF8] p-5"
                    >
                      <p className="text-sm leading-relaxed text-foreground/88">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="flex h-full flex-col rounded-[32px] border border-[#E8DCCF] bg-[#FFFDF8] p-8 shadow-[0_22px_70px_-48px_rgba(62,47,40,0.18)] backdrop-blur-[1px] lg:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#C89B7B] mb-4">
                  Ce que comprennent toutes mes prestations
                </p>
                <h2 className="font-display text-3xl md:text-4xl italic text-primary mb-6">
                  Un rendu soigné, du début à la fin
                </h2>
                <div className="space-y-4 text-sm leading-relaxed text-foreground/88">
                  <p>
                    La retouche professionnelle de chaque photo choisie est réalisée après la
                    sélection, pour garantir un rendu harmonieux, naturel et fidèle à votre univers.
                  </p>
                  <p>
                    La livraison se fait ensuite en haute définition sur une galerie privée en
                    ligne, simple à partager et à conserver.
                  </p>
                  <p>
                    Les formules peuvent évoluer selon votre projet, vos envies et le type de séance
                    souhaité.
                  </p>
                </div>
                <div className="mt-8 rounded-[24px] border border-border bg-background p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-accent">
                    Séances concernées
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                    Portrait, couple, maternité et famille. Les prestations sont pensées pour
                    s’adapter à chaque histoire, chaque rythme et chaque lieu.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative px-6 pb-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(services ?? []).map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <div
                  className={`relative h-full p-8 lg:p-10 ${s.featured ? "border-2 border-accent bg-surface/100" : "border border-border bg-surface/100"} backdrop-blur-[1px]`}
                >
                  {s.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 text-[9px] uppercase tracking-[0.3em]">
                      Populaire
                    </span>
                  )}
                  <h3 className="font-display text-3xl italic mb-1 text-primary">{s.name}</h3>
                  <p className="text-accent font-mono text-sm mb-2">{s.price_eur}€</p>
                  <p className="text-xs text-foreground/84 italic mb-6">{s.description}</p>
                  <ul className="text-sm text-foreground/85 space-y-3 border-t border-border pt-6">
                    {(s.features ?? []).map((f: string) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-accent">·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* Options */}
      <section className="py-20 px-6 bg-surface border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic mb-10">Les options</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <div className="p-6 border border-border bg-background">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
                  +30 min
                </p>
                <p className="font-display text-xl italic">50€</p>
              </div>
              <div className="p-6 border border-border bg-background">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
                  Photo supplémentaire
                </p>
                <p className="font-display text-xl italic">25€</p>
              </div>
              <div className="p-6 border border-border bg-background">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
                  Tirage photo
                </p>
                <p className="font-display text-xl italic">Sur demande</p>
              </div>
            </div>
            <p className="mt-12 italic text-foreground/85 max-w-2xl mx-auto">
              « Mes formules peuvent être adaptées à votre projet, vos envies, alors n'hésitez pas à
              me contacter pour en discuter ensemble. »
            </p>
          </Reveal>
        </div>
      </section>

      {/* Guide */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl italic mb-12">
              Guide pour choisir votre formule
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Souvenir",
                  text: "Une parenthèse essentielle pour capturer l’instant.",
                },
                {
                  title: "Lumière",
                  text: "Pour avoir davantage de choix parmi vos souvenirs.",
                },
                {
                  title: "Éternité",
                  text: "Toute la galerie d’une séance complète pour ne rien manquer.",
                },
                {
                  title: "Héritage",
                  text: "Une expérience plus longue avec plusieurs tenues et lieux proches.",
                },
              ].map((item) => (
                <div key={item.title} className="p-6 border border-border bg-surface">
                  <p className="font-display text-2xl italic text-primary mb-3">{item.title}</p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
