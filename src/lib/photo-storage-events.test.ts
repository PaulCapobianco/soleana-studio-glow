import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }),
      }),
    },
  },
}));

import { buildStorageGalleries } from "./photo-storage";

// publicImageUrl ne passe plus par supabase-js : l'hôte des images vient de VITE_IMAGE_BASE_URL.
vi.stubEnv("VITE_IMAGE_BASE_URL", "https://cdn.test");

const variants = (path: string) =>
  [400, 800, 1600].flatMap((width) =>
    (["avif", "webp"] as const).map((format) => ({
      width,
      height: width * 1.5,
      storage_path: `${path}-${width}.${format}`,
      format,
    })),
  );
const row = (slot: string, order: number, id: string, alt: string | null = null) => ({
  slot,
  display_order: order,
  alt_text_override: alt,
  object_position_x_pct: 50,
  object_position_y_pct: 20,
  photo: { id, alt_text: `photo ${id}`, photo_variants: variants(`events/noel-2026/${id}`) },
});

// Les galeries d'un événement (Noël 2026 : 4 séances + décor, 74 photos) utilisent les mêmes
// emplacements que les pages SEO : une galerie par `slot`, couverture en display_order 0.
describe("galeries d'événement via photo_placements", () => {
  const rows = [
    row("session-02", 1, "b2"),
    row("session-01", 2, "a3"),
    row("session-01", 0, "a1", "Famille sous les sapins"),
    row("session-01", 1, "a2"),
    row("decor", 0, "d1"),
  ];
  const galleries = buildStorageGalleries(rows);

  it("regroupe par galerie (slot) et ordonne, couverture en premier", () => {
    expect(Object.keys(galleries).sort()).toEqual(["decor", "session-01", "session-02"]);
    expect(galleries["session-01"].map((p) => p.id)).toEqual(["a1", "a2", "a3"]);
  });
  it("texte alternatif de l'emplacement sinon celui de la photo, srcset AVIF et WebP", () => {
    const [first, second] = galleries["session-01"];
    expect(first.alt_text).toBe("Famille sous les sapins");
    expect(second.alt_text).toBe("photo a2");
    expect(first.avif_srcset).toContain("https://cdn.test/events/noel-2026/a1-400.avif 400w");
    expect(first.webp_srcset).toContain("1600w");
    expect(first.object_position).toBe("50% 20%");
  });
  it("écarte une photo dont les variantes sont incomplètes", () => {
    const broken = {
      ...row("session-01", 0, "x"),
      photo: {
        id: "x",
        alt_text: "x",
        photo_variants: variants("x").filter((v) => v.format === "webp"),
      },
    };
    expect(buildStorageGalleries([broken])).toEqual({});
  });
});

import { flattenGalleries, type StorageGalleryPhoto } from "./photo-storage";

describe("flattenGalleries (pages catégories, BUG-02)", () => {
  const photo = (id: string): StorageGalleryPhoto => ({ id }) as StorageGalleryPhoto;
  it("garde l'ordre des slots et déduplique une photo réutilisée", () => {
    const out = flattenGalleries({
      "gallery-2": [photo("b"), photo("c")],
      "gallery-1": [photo("a"), photo("b")],
    });
    expect(out.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});
