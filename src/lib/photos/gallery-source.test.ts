import { describe, expect, it } from "vitest";
import { needsLegacyPhotos } from "./gallery-source";

describe("needsLegacyPhotos", () => {
  it("interrupteur éteint : toujours l'ancienne table (comportement d'avant)", () => {
    expect(needsLegacyPhotos(false, { pending: true, photos: undefined })).toBe(true);
    expect(needsLegacyPhotos(false, { pending: false, photos: [1] })).toBe(true);
  });
  it("interrupteur actif : on attend Storage avant de lire l'ancienne table", () => {
    expect(needsLegacyPhotos(true, { pending: true, photos: undefined })).toBe(false);
  });
  it("interrupteur actif et Storage a des photos : l'ancienne table n'est jamais lue", () => {
    expect(needsLegacyPhotos(true, { pending: false, photos: [{}, {}] })).toBe(false);
  });
  it.each([
    ["liste vide", []],
    ["erreur ou catégorie inconnue (null)", null],
    ["absent", undefined],
  ])("interrupteur actif, Storage répond %s : repli sur l'ancienne table", (_l, photos) => {
    expect(needsLegacyPhotos(true, { pending: false, photos })).toBe(true);
  });
});
