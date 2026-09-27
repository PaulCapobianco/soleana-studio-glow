import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildImportPlan, IMPORT_PHOTO_DEFAULTS, isLegacyGalleryVisible } from "./import-plan.mjs";

const manifestPath = path.resolve(import.meta.dirname, "../../docs/photos-storage/manifest-phase1.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

describe("simulation logique de l'import Storage", () => {
  it("ne publie ni ne rattache à une catégorie legacy les photos importées", () => {
    expect(IMPORT_PHOTO_DEFAULTS).toEqual({
      published: false,
      category_id: null,
      on_home: false,
      on_portfolio: false,
    });
    expect(isLegacyGalleryVisible({ ...IMPORT_PHOTO_DEFAULTS })).toBe(false);
    expect(isLegacyGalleryVisible({ category_id: "legacy-category", published: true })).toBe(true);
    expect(isLegacyGalleryVisible({ ...IMPORT_PHOTO_DEFAULTS, published: true, on_home: true })).toBe(true);
    expect(isLegacyGalleryVisible({ ...IMPORT_PHOTO_DEFAULTS, published: true, on_portfolio: true })).toBe(true);
  });

  it("planifie quatre photos en huit variantes par photo sans les publier ni les catégoriser", () => {
    const plan = buildImportPlan(manifest, { limit: 4 });
    expect(plan.photoCount).toBe(4);
    expect(plan.variantCount).toBe(32);
    expect(plan.variantCountsByWidth).toEqual({ 400: 8, 800: 8, 1200: 8, 1600: 8 });
    expect(plan.placementCount).toBe(4);
  });

  it("planifie le lot complet en 1 360 variantes et 190 emplacements", () => {
    const plan = buildImportPlan(manifest);
    expect(plan.photoCount).toBe(170);
    expect(plan.variantCount).toBe(1360);
    expect(plan.variantCountsByWidth).toEqual({ 400: 340, 800: 340, 1200: 340, 1600: 340 });
    expect(plan.placementCount).toBe(190);
  });
});
