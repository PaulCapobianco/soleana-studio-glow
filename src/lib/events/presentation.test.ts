import { describe, expect, it } from "vitest";
import { legacyNoelEvent } from "./legacy-noel";
import { parseEventRow } from "./parse";
import { buildEventJsonLd, buildTeaser, eventSeo } from "./presentation";
import type { EventRow } from "./types";

describe("contenu de repli de Noël 2026", () => {
  const event = legacyNoelEvent();

  it("reprend le SEO, les dates et les deux formules du code d'origine", () => {
    expect(eventSeo(event)).toMatchObject({
      title: "Mini-séances de Noël 2026 près de Marseille | Soleana Studio",
      path: "/mini-seances-noel-2026",
    });
    expect(event.event_dates).toEqual(["2026-11-28", "2026-11-29"]);
    expect(event.fallback_dates).toEqual(["2026-12-05", "2026-12-06"]);
    expect(event.formules.map((f) => [f.name, f.price_eur])).toEqual([
      ["Douceur de Noël", 110],
      ["Magie de Noël", 250],
    ]);
  });

  it("teaser : mêmes textes qu'avant", () => {
    expect(buildTeaser(event)).toMatchObject({
      title: "Mini-séances de Noël 2026",
      datesLabel: "28 & 29 novembre 2026",
      location: "Plan-d'Aups-Sainte-Baume",
      cta: "Découvrir les mini-séances",
    });
  });

  it("données structurées : un Event par jour, avec les offres", () => {
    const ld = buildEventJsonLd(event, "/img/hero.webp");
    expect(ld["@graph"].map((e) => e.startDate)).toEqual(["2026-11-28", "2026-11-29"]);
    expect(ld["@graph"][0].offers?.map((o) => o.price)).toEqual([110, 250]);
    expect(ld["@graph"][0].image).toEqual(["https://soleanastudio.fr/img/hero.webp"]);
  });
});

describe("parseEventRow", () => {
  const base = legacyNoelEvent() as unknown as EventRow;

  it("écarte les entrées JSON mal formées sans faire échouer la page", () => {
    const parsed = parseEventRow({
      ...base,
      formules: [
        { name: "Ok", price_eur: 10, features: [], booking_url: "https://a.io", featured: false },
        { name: "", price_eur: "dix" },
        "n'importe quoi",
      ],
      faq: [{ question: "Q ?", answer: "R" }, { question: "sans réponse" }],
    });
    expect(parsed.formules).toHaveLength(1);
    expect(parsed.faq).toHaveLength(1);
  });

  it("un statut inconnu devient « brouillon » (donc jamais affiché)", () => {
    expect(parseEventRow({ ...base, status: "???" }).status).toBe("draft");
  });
});

describe("SEO déduit", () => {
  it("utilise le titre et le sous-titre quand les champs SEO sont vides", () => {
    const event = {
      ...legacyNoelEvent(),
      meta_title: "",
      meta_description: "",
      subtitle: "Sous-titre",
    };
    expect(eventSeo(event)).toMatchObject({
      title: "Mini-séances de Noël 2026 | Soleana Studio",
      description: "Sous-titre",
    });
  });
});
