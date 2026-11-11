import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { AdminValidationError } from "@/lib/admin/friendly-error";
import {
  addGalleryDef,
  moveGalleryDef,
  nextPlacementOrder,
  normalizeFraming,
  swapPlan,
} from "./gallery-admin";

describe("normalizeFraming", () => {
  it("arrondit et accepte 0 et 100", () => {
    expect(normalizeFraming(0, 100)).toEqual({ x: 0, y: 100 });
    expect(normalizeFraming(33.4, 66.6)).toEqual({ x: 33, y: 67 });
  });
  it.each([
    [-1, 50],
    [50, 101],
    [Number.NaN, 50],
    [50, Number.POSITIVE_INFINITY],
  ])("refuse %s / %s avec un message en français", (x, y) => {
    expect(() => normalizeFraming(x, y)).toThrow(AdminValidationError);
    expect(() => normalizeFraming(x, y)).toThrow(/entre 0 et 100/);
  });
});

describe("cas limites des galeries d'événement", () => {
  it("nextPlacementOrder : 0 si vide, sinon max + 1 même avec des trous", () => {
    expect(nextPlacementOrder([])).toBe(0);
    expect(
      nextPlacementOrder([
        { id: "a", display_order: 0 },
        { id: "b", display_order: 7 },
      ]),
    ).toBe(8);
  });
  it("swapPlan : rien à échanger aux extrémités ou pour une photo inconnue", () => {
    const items = [
      { id: "a", display_order: 0 },
      { id: "b", display_order: 1 },
    ];
    expect(swapPlan(items, "a", -1)).toBeNull();
    expect(swapPlan(items, "b", 1)).toBeNull();
    expect(swapPlan(items, "zzz", 1)).toBeNull();
    expect(swapPlan(items, "a", 1)?.b.id).toBe("b");
  });
  it("addGalleryDef refuse un titre vide et génère des identifiants distincts", () => {
    expect(() => addGalleryDef([], "   ")).toThrow(AdminValidationError);
    const one = addGalleryDef([], "Édition précédente");
    const two = addGalleryDef(one, "Décor");
    expect(new Set(two.map((d) => d.slot)).size).toBe(2);
  });
  it("moveGalleryDef ne sort pas des bornes", () => {
    const defs = addGalleryDef(addGalleryDef([], "A"), "B");
    expect(moveGalleryDef(defs, defs[0].slot, -1)).toEqual(defs);
    expect(moveGalleryDef(defs, defs[1].slot, 1)).toEqual(defs);
  });
});
