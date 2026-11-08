import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import type { StorageGalleryPhoto } from "@/lib/photo-storage";
import {
  buildGalleryGroups,
  newGallerySlot,
  parseGalleryDefs,
  publicGalleries,
  validateGalleryTitle,
} from "./galleries";
import {
  addGalleryDef,
  moveGalleryDef,
  nextPlacementOrder,
  renameGalleryDef,
  swapPlan,
} from "./gallery-admin";

const photo = (id: string): StorageGalleryPhoto => ({
  id,
  image_url: `https://cdn/${id}.webp`,
  srcset: "",
  avif_srcset: "",
  webp_srcset: "",
  alt_text: id,
  location: null,
  title: null,
  display_order: 0,
  object_position: "50% 50%",
  width: 1600,
  height: 1067,
});

describe("parseGalleryDefs", () => {
  it("garde les entrées valides, écarte le reste et les doublons de slot", () => {
    const defs = parseGalleryDefs([
      { slot: "galerie-1", title: " Famille " },
      { slot: "galerie-1", title: "Doublon" },
      { slot: "Bad Slot", title: "x" },
      { slot: "galerie-2", title: "" },
      "n'importe quoi",
      { slot: "decor", title: "Décor" },
    ]);
    expect(defs).toEqual([
      { slot: "galerie-1", title: "Famille" },
      { slot: "decor", title: "Décor" },
    ]);
  });
  it("une valeur qui n'est pas un tableau donne une liste vide", () => {
    expect(parseGalleryDefs(null)).toEqual([]);
    expect(parseGalleryDefs({})).toEqual([]);
    expect(parseGalleryDefs(undefined)).toEqual([]);
  });
});

describe("newGallerySlot / titres", () => {
  it("ne réutilise jamais un identifiant existant", () => {
    expect(newGallerySlot([])).toBe("galerie-1");
    expect(newGallerySlot([{ slot: "galerie-1", title: "a" }])).toBe("galerie-2");
    expect(newGallerySlot([{ slot: "galerie-2", title: "a" }])).toBe("galerie-3"); // galerie-1 supprimée, 2 présente
    expect(
      newGallerySlot([
        { slot: "galerie-2", title: "a" },
        { slot: "galerie-3", title: "b" },
      ]),
    ).toBe("galerie-4");
  });
  it("valide le titre", () => {
    expect(validateGalleryTitle("Famille")).toBeNull();
    expect(validateGalleryTitle("  ")).toMatch(/nom/);
    expect(validateGalleryTitle("x".repeat(81))).toMatch(/trop long/);
  });
});

describe("publicGalleries / buildGalleryGroups", () => {
  const defs = [
    { slot: "a", title: "Famille" },
    { slot: "b", title: "Couples" },
    { slot: "c", title: "Vide" },
  ];
  const bySlot = { a: [photo("a1"), photo("a2")], b: [photo("b1")], orphelin: [photo("z")] };

  it("suit l'ordre des définitions, ignore les galeries vides et les slots inconnus", () => {
    const g = publicGalleries(defs, bySlot);
    expect(g.map((x) => [x.slot, x.title, x.photos.length])).toEqual([
      ["a", "Famille", 2],
      ["b", "Couples", 1],
    ]);
  });
  it("lecture impossible (null) : aucune galerie", () => {
    expect(publicGalleries(defs, null)).toEqual([]);
  });
  it("galeries propres puis « Édition précédente », seulement si elle a des photos", () => {
    const own = publicGalleries(defs, bySlot);
    const prev = {
      title: "Noël 2025",
      slug: "noel-2025",
      galleries: publicGalleries([{ slot: "x", title: "X" }], { x: [photo("p")] }),
    };
    const groups = buildGalleryGroups({ own, previous: prev });
    expect(groups.map((g) => g.previousEdition?.title ?? null)).toEqual([null, "Noël 2025"]);
    expect(
      buildGalleryGroups({ own: [], previous: prev }).map((g) => g.previousEdition?.slug),
    ).toEqual(["noel-2025"]);
    expect(buildGalleryGroups({ own, previous: { ...prev, galleries: [] } })).toHaveLength(1);
    expect(buildGalleryGroups({ own: [], previous: null })).toEqual([]);
  });
});

describe("gestion des galeries (fonctions pures de l'admin)", () => {
  const defs = [
    { slot: "galerie-1", title: "A" },
    { slot: "galerie-2", title: "B" },
  ];
  it("ajoute avec un identifiant généré, renomme, déplace", () => {
    expect(addGalleryDef(defs, "  Décor ")).toEqual([
      ...defs,
      { slot: "galerie-3", title: "Décor" },
    ]);
    expect(renameGalleryDef(defs, "galerie-2", "Bébés")[1]).toEqual({
      slot: "galerie-2",
      title: "Bébés",
    });
    expect(moveGalleryDef(defs, "galerie-2", -1).map((d) => d.slot)).toEqual([
      "galerie-2",
      "galerie-1",
    ]);
    expect(moveGalleryDef(defs, "galerie-1", -1)).toEqual(defs);
  });
  it("refuse un titre vide", () => {
    expect(() => addGalleryDef(defs, " ")).toThrow(/nom/);
    expect(() => renameGalleryDef(defs, "galerie-1", "")).toThrow();
  });
  it("ordre des photos : échange avec la voisine, impossible aux extrémités", () => {
    const items = [
      { id: "a", display_order: 0 },
      { id: "b", display_order: 1 },
      { id: "c", display_order: 4 },
    ];
    expect(swapPlan(items, "b", -1)).toEqual({ a: items[1], b: items[0] });
    expect(swapPlan(items, "b", 1)).toEqual({ a: items[1], b: items[2] });
    expect(swapPlan(items, "a", -1)).toBeNull();
    expect(swapPlan(items, "c", 1)).toBeNull();
    expect(swapPlan(items, "zz", 1)).toBeNull();
    expect(nextPlacementOrder(items)).toBe(5);
    expect(nextPlacementOrder([])).toBe(0);
  });
});
