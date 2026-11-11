import { describe, expect, it } from "vitest";
import { hasBothFormats, largestVariant, matchedAvifWebp, variantsOfFormat } from "./variants";

const v = (format: string, width: number) => ({ format, width, path: `${format}-${width}` });

describe("variantsOfFormat", () => {
  it("filtre par format et trie par largeur croissante sans modifier l'entrée", () => {
    const input = [v("webp", 1600), v("avif", 400), v("webp", 400), v("webp", 800)];
    const copy = [...input];
    expect(variantsOfFormat(input, "webp").map((x) => x.width)).toEqual([400, 800, 1600]);
    expect(input).toEqual(copy);
  });
  it("accepte null, undefined et le vide", () => {
    expect(variantsOfFormat(null, "avif")).toEqual([]);
    expect(variantsOfFormat(undefined, "webp")).toEqual([]);
    expect(variantsOfFormat([], "webp")).toEqual([]);
  });
  it("ignore les formats inconnus (png, jpeg)", () => {
    expect(variantsOfFormat([v("png", 400), v("jpeg", 800)], "webp")).toEqual([]);
  });
});

describe("largestVariant", () => {
  it("renvoie la plus large du format demandé", () => {
    expect(largestVariant([v("webp", 800), v("webp", 1600), v("avif", 2400)], "webp")?.width).toBe(
      1600,
    );
  });
  it("renvoie undefined sans variante du format", () => {
    expect(largestVariant([v("avif", 400)], "webp")).toBeUndefined();
    expect(largestVariant(undefined, "avif")).toBeUndefined();
  });
});

describe("hasBothFormats", () => {
  it("exige AVIF et WebP", () => {
    expect(hasBothFormats([v("avif", 400), v("webp", 400)])).toBe(true);
    expect(hasBothFormats([v("avif", 400)])).toBe(false);
    expect(hasBothFormats([v("webp", 400)])).toBe(false);
    expect(hasBothFormats(null)).toBe(false);
  });
});

describe("matchedAvifWebp", () => {
  it("accepte des largeurs identiques dans les deux formats, triées", () => {
    const set = matchedAvifWebp([v("webp", 800), v("avif", 400), v("webp", 400), v("avif", 800)]);
    expect(set?.avif.map((x) => x.width)).toEqual([400, 800]);
    expect(set?.webp.map((x) => x.width)).toEqual([400, 800]);
  });
  it.each([
    ["aucune variante", []],
    ["AVIF seul", [v("avif", 400)]],
    ["WebP seul", [v("webp", 400)]],
    ["nombres différents", [v("avif", 400), v("avif", 800), v("webp", 400)]],
    ["largeurs différentes", [v("avif", 400), v("webp", 800)]],
  ])("refuse : %s", (_label, input) => {
    expect(matchedAvifWebp(input)).toBeNull();
  });
});
