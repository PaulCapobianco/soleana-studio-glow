import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEventImportPlan,
  eventVariantPath,
  mergeGalleryDefs,
  validateEventManifest,
} from "./event-import-plan.mjs";

const manifestPath = path.resolve(
  import.meta.dirname,
  "../../docs/photos-storage/manifest-noel-event.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const clone = () => structuredClone(manifest);

describe("manifeste Noël (contexte event)", () => {
  it("est valide : 74 photos, 74 emplacements, 5 galeries, 592 variantes", () => {
    expect(validateEventManifest(manifest)).toEqual([]);
    const plan = buildEventImportPlan(manifest);
    expect(plan.photos).toHaveLength(74);
    expect(plan.placements).toHaveLength(74);
    expect(plan.variantCount).toBe(592);
    expect(plan.perGallery.map((g) => g.count)).toEqual([13, 11, 19, 12, 19]);
    expect(plan.eventSlug).toBe("mini-seances-noel-2026");
  });
  it("chaque photo a un texte alternatif unique et descriptif", () => {
    const alts = manifest.photos.map((p: { alt_text: string }) => p.alt_text);
    expect(new Set(alts).size).toBe(alts.length);
    expect(alts.every((a: string) => /Noël 2026/.test(a))).toBe(true);
  });
  it("--limit et --only restreignent photos, emplacements et variantes", () => {
    const four = buildEventImportPlan(manifest, { limit: 4 });
    expect(four.photos).toHaveLength(4);
    expect(four.placements).toHaveLength(4);
    expect(four.variantCount).toBe(32);
    const one = buildEventImportPlan(manifest, { only: [manifest.photos[10].source_key] });
    expect(one.photos).toHaveLength(1);
    expect(() =>
      buildEventImportPlan(manifest, { only: ["galleries/evenement/000000000000"] }),
    ).toThrow(/inconnue/);
  });
});

describe("validateEventManifest refuse les manifestes faux", () => {
  it("version, événement, galeries", () => {
    expect(validateEventManifest({ ...clone(), version: 2 }).join()).toMatch(/version/);
    expect(validateEventManifest({ ...clone(), event_slug: "Pas Valide" }).join()).toMatch(
      /event_slug/,
    );
    const dupe = clone();
    dupe.galleries.push({ ...dupe.galleries[0] });
    expect(validateEventManifest(dupe).join()).toMatch(/slot en double/);
  });
  it("photos : clé hors convention, doublon, alt vide, empreinte", () => {
    const m = clone();
    m.photos[0].source_key = "galleries/couple/aaaaaaaaaaaa";
    m.photos[1].alt_text = "  ";
    m.photos[2].source_sha256 = "xyz";
    m.photos[4].source_key = m.photos[3].source_key;
    const problems = validateEventManifest(m).join("|");
    expect(problems).toMatch(/source_key invalide/);
    expect(problems).toMatch(/texte alternatif manquant/);
    expect(problems).toMatch(/empreinte invalide/);
    expect(problems).toMatch(/photo en double/);
  });
  it("emplacements : contexte, événement, galerie ou photo inconnue, cadrage, ordre", () => {
    const m = clone();
    m.placements[0].context_type = "seo";
    m.placements[1].event_slug = "autre";
    m.placements[2].slot = "inconnue";
    m.placements[3].source_key = "galleries/evenement/ffffffffffff";
    m.placements[4].object_position_x_pct = 120;
    m.placements[5].display_order = 99;
    const problems = validateEventManifest(m).join("|");
    for (const expected of [
      "contexte inattendu",
      "événement inattendu",
      "galerie inconnue",
      "photo inconnue",
      "cadrage hors",
      "ordre non contigu",
    ])
      expect(problems).toContain(expected);
    expect(() => buildEventImportPlan(m)).toThrow(/Manifeste invalide/);
  });
});

describe("chemins et galeries", () => {
  it("le chemin de variante respecte la convention des politiques Storage", () => {
    const p = eventVariantPath("galleries/evenement/0123456789ab", "89abcdef", 1600, "avif");
    expect(p).toMatch(
      /^galleries\/[a-z0-9][a-z0-9_-]*\/[a-f0-9]{12,32}\/[a-f0-9]{8}-(400|800|1200|1600)\.(avif|webp)$/,
    );
  });
  it("mergeGalleryDefs garde l'existant (titres modifiés par la photographe) et ajoute le reste", () => {
    const wanted = [
      { slot: "galerie-1", title: "Séance 1" },
      { slot: "galerie-2", title: "Séance 2" },
    ];
    expect(mergeGalleryDefs([], wanted)).toEqual(wanted);
    expect(mergeGalleryDefs(null, wanted)).toEqual(wanted);
    const merged = mergeGalleryDefs([{ slot: "galerie-1", title: "Famille" }], wanted);
    expect(merged).toEqual([
      { slot: "galerie-1", title: "Famille" },
      { slot: "galerie-2", title: "Séance 2" },
    ]);
  });
});
