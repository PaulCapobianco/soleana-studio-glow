// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryGallerySection } from "@/components/site/CategoryGallerySection";
import { buildStorageGalleries } from "@/lib/photo-storage";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://images.example/${path}` } }) }) } },
}));

afterEach(cleanup);

const row = {
  slot: "gallery-1",
  display_order: 0,
  alt_text_override: "Portrait en lumière naturelle",
  object_position_x_pct: 40,
  object_position_y_pct: 60,
  photo: {
    id: "photo-1",
    alt_text: "Portrait",
    photo_variants: [
      { width: 800, height: 1000, storage_path: "p-800.webp", format: "webp" },
      { width: 400, height: 500, storage_path: "p-400.avif", format: "avif" },
      { width: 800, height: 1000, storage_path: "p-800.avif", format: "avif" },
      { width: 400, height: 500, storage_path: "p-400.webp", format: "webp" },
    ],
  },
};

function gallery(photos: Parameters<typeof CategoryGallerySection>[0]["photos"]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CategoryGallerySection categorySlugs={[]} subtitle="Séance" title="Galerie" photos={photos} />
    </QueryClientProvider>,
  );
}

describe("Storage des galeries", () => {
  it("associe AVIF et WebP par largeur, avec URL WebP de repli", () => {
    const photo = buildStorageGalleries([row])["gallery-1"][0];
    expect(photo.image_url).toBe("https://images.example/p-800.webp");
    expect(photo.avif_srcset).toBe("https://images.example/p-400.avif 400w, https://images.example/p-800.avif 800w");
    expect(photo.webp_srcset).toBe("https://images.example/p-400.webp 400w, https://images.example/p-800.webp 800w");
    expect(photo.object_position).toBe("40% 60%");
    expect(photo.alt_text).toBe("Portrait en lumière naturelle");
    expect(buildStorageGalleries([{ ...row, photo: { ...row.photo, photo_variants: row.photo.photo_variants.slice(0, 3) } }])).toEqual({});
  });

  it("rend picture pour Storage, mais garde img seul pour les fichiers locaux", () => {
    const stored = buildStorageGalleries([row])["gallery-1"];
    const storageView = gallery(stored);
    expect(storageView.container.querySelectorAll("picture")).toHaveLength(1);
    expect(storageView.container.querySelector('source[type="image/avif"]')).not.toBeNull();
    expect(storageView.container.querySelector('source[type="image/webp"]')).not.toBeNull();
    storageView.unmount();

    const localView = gallery([{ id: "local", image_url: "/local.webp", alt_text: "Portrait", location: null, title: null, display_order: 0 }]);
    expect(localView.container.querySelector("picture")).toBeNull();
    expect(localView.container.querySelector("img")?.getAttribute("src")).toBe("/local.webp");
  });

  it("ne recharge pas les anciennes photos lorsqu'une galerie Storage est volontairement vide", () => {
    const view = gallery([]);
    expect(view.container.textContent).toContain("Galerie en cours de remplissage");
  });
});
