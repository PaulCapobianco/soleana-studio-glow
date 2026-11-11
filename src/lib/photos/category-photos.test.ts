import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { from: string[]; select: string[]; eq: [string, unknown][]; order: string[] } = {
  from: [],
  select: [],
  eq: [],
  order: [],
};
let result: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: async () => ({
    from(table: string) {
      calls.from.push(table);
      const builder: Record<string, unknown> = {
        select(s: string) {
          calls.select.push(s);
          return builder;
        },
        eq(column: string, value: unknown) {
          calls.eq.push([column, value]);
          return builder;
        },
        order(column: string) {
          calls.order.push(column);
          return Promise.resolve(result);
        },
      };
      return builder;
    },
  }),
}));

import { loadCategoryPhotos } from "./gallery-loaders";

const variants = (id: string) =>
  [400, 800].flatMap((width) =>
    ["avif", "webp"].map((format) => ({
      width,
      height: width * 2,
      format,
      storage_path: `galleries/famille/${id}/x-${width}.${format}`,
    })),
  );
const row = (slot: string, order: number, id: string) => ({
  slot,
  display_order: order,
  alt_text_override: null,
  object_position_x_pct: 50,
  object_position_y_pct: 50,
  photo: { id, alt_text: `Photo ${id}`, photo_variants: variants(id) },
});

beforeEach(() => {
  calls.from = [];
  calls.select = [];
  calls.eq = [];
  calls.order = [];
  result = { data: [], error: null };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("loadCategoryPhotos", () => {
  it("lit les photos de la catégorie en UNE requête, filtrée sur la page SEO publiée", async () => {
    result = { data: [row("gallery-1", 0, "a"), row("gallery-1", 1, "b")], error: null };
    const photos = await loadCategoryPhotos("famille");
    expect(photos?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(calls.from).toEqual(["photo_placements"]);
    expect(calls.select[0]).toContain("seo_pages!inner(slug, published)");
    expect(calls.eq).toEqual([
      ["seo_pages.slug", "photographe-famille-marseille"],
      ["seo_pages.published", true],
      ["context_type", "seo"],
      ["published", true],
    ]);
    expect(calls.order).toEqual(["display_order"]);
  });

  it("retire les doublons entre galeries (une photo placée deux fois compte une fois)", async () => {
    result = {
      data: [row("gallery-1", 0, "a"), row("gallery-1", 1, "b"), row("gallery-2", 0, "a")],
      error: null,
    };
    expect((await loadCategoryPhotos("famille"))?.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("renvoie une liste vide (pas null) quand la page n'a aucune photo publiée", async () => {
    expect(await loadCategoryPhotos("couple")).toEqual([]);
  });

  it("renvoie null sans requête pour une catégorie inconnue", async () => {
    expect(await loadCategoryPhotos("mariage")).toBeNull();
    expect(calls.from).toEqual([]);
  });

  it("renvoie null en cas d'erreur Supabase ou d'exception (le repli reste possible)", async () => {
    result = { data: null, error: { message: "boom" } };
    expect(await loadCategoryPhotos("portrait")).toBeNull();
    result = { data: [row("gallery-1", 0, "a")], error: null };
    result = Promise.reject(new Error("réseau")) as never;
    expect(await loadCategoryPhotos("portrait")).toBeNull();
  });
});
