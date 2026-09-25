import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Reveal } from "@/components/site/Reveal";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { buildPageSeo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/faq")({
  loader: async () => {
    const { data, error } = await supabase
      .from("faq")
      .select("*")
      .eq("published", true)
      .order("display_order");
    if (error) {
      console.error("[faq] Failed to load public content", error);
      throw new Error("Le contenu est momentanément indisponible.");
    }
    return data ?? [];
  },
  head: () =>
    buildPageSeo({
      title: "FAQ — Soleana Studio",
      description:
        "Toutes les réponses à vos questions sur les séances photo Soleana Studio à Marseille.",
      path: "/faq",
      ogTitle: "FAQ — Soleana Studio",
      ogDescription: "Questions fréquentes sur les séances photo.",
    }),
  component: Faq,
});

function Faq() {
  const items = Route.useLoaderData();
  const faqItems = (items ?? []).map((item) =>
    item.question === "Où peut se dérouler la séance ?"
      ? {
          ...item,
          answer:
            "Les séances se déroulent essentiellement en bord de mer ou dans la nature, à Marseille et alentours. Je reste aussi ouverte à d'autres propositions si le lieu est adapté à votre séance.",
        }
      : item,
  );

  return (
    <SiteShell>
      <section className="pt-40 pb-16 px-6 text-center">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-4">FAQ</p>
          <h1 className="font-display text-5xl md:text-6xl italic text-primary mb-6">
            Questions fréquentes
          </h1>
        </Reveal>
      </section>

      <section className="pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          <Accordion.Root type="single" collapsible className="space-y-2">
            {faqItems.map((q) => (
              <Accordion.Item key={q.id} value={q.id} className="border-b border-border">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between py-6 text-left font-display text-xl italic text-foreground hover:text-primary transition-colors">
                    {q.question}
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content
                  forceMount
                  className="data-[state=closed]:hidden overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
                >
                  <p className="pb-6 text-muted-foreground leading-relaxed">{q.answer}</p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>
    </SiteShell>
  );
}
