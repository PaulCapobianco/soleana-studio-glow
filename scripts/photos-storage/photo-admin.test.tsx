import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateBrowserPhotoVariants } from "@/lib/photo-storage";
import { PhotosAdmin } from "@/routes/admin/_authed/photos";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { toast } from "sonner";

const state = vi.hoisted(() => ({
  inserts: [] as { table: string; payload: unknown }[],
  deletes: [] as string[],
  uploads: [] as string[],
  removes: [] as string[][],
  failVariants: false,
  existingPhoto: false,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/admin/use-dirty-set", () => ({ useDirtySet: () => () => {} }));
vi.mock("@/lib/photo-storage", () => ({ generateBrowserPhotoVariants: vi.fn() }));
vi.mock("@/lib/admin/confirm-delete", () => ({ confirmDelete: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async (path: string) => { state.uploads.push(path); return { error: null }; },
        remove: async (paths: string[]) => { state.removes.push(paths); return { error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://images.example/photos/${path}` } }),
      }),
    },
    from: (table: string) => ({
      select: () => {
        const rows = table === "categories"
          ? [{ id: "cat-1", slug: "portrait", name: "Portrait", display_order: 0 }]
          : table === "seo_pages"
            ? [{ id: "seo-1", slug: "photographe-portrait-marseille", h1: "Portrait à Marseille", published: true }]
            : table === "photos" && state.existingPhoto
              ? [{ id: "photo-existing", image_url: "https://images.example/photos/old.webp", alt_text: "Portrait", category_id: "cat-1", published: true, on_home: false, on_portfolio: false, category: { name: "Portrait", slug: "portrait" } }]
              : table === "photo_variants" && state.existingPhoto
                ? [{ id: "variant-1", photo_id: "photo-existing", storage_path: "galleries/portrait/abc/400.avif", format: "avif", width: 400 }, { id: "variant-2", photo_id: "photo-existing", storage_path: "galleries/portrait/abc/400.webp", format: "webp", width: 400 }]
                : table === "photo_placements" && state.existingPhoto
                  ? [{ id: "placement-1", photo_id: "photo-existing", seo_page_id: "seo-1", slot: "gallery-1", display_order: 0, object_position_x_pct: 50, object_position_y_pct: 50, published: false }]
                  : [];
        const result = { data: rows, error: null };
        const query = {
          order: async () => result,
          eq: async () => result,
          then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
      insert: (payload: unknown) => {
        state.inserts.push({ table, payload });
        if (table === "photos") return { select: () => ({ single: async () => ({ data: { id: "photo-new" }, error: null }) }) };
        return Promise.resolve({ error: table === "photo_variants" && state.failVariants ? { message: "Simulation d'échec" } : null });
      },
      delete: () => ({ eq: async () => { state.deletes.push(table); return { error: null }; } }),
    }),
  },
}));

function renderAdmin() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <PhotosAdmin />
  </QueryClientProvider>);
}

async function fillUpload() {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/Photo depuis l'appareil/) as HTMLInputElement;
  await user.upload(input, new File(["fake image"], "portrait.jpg", { type: "image/jpeg" }));
  await user.type(screen.getByLabelText(/Texte alternatif obligatoire/), "Portrait en lumière naturelle");
  await user.selectOptions(screen.getByLabelText(/Page galerie/), "seo-1");
  fireEvent.submit(screen.getByRole("button", { name: "Ajouter à la galerie" }).closest("form")!);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.inserts = [];
  state.deletes = [];
  state.uploads = [];
  state.removes = [];
  state.failVariants = false;
  state.existingPhoto = false;
  vi.mocked(confirmDelete).mockReturnValue(true);
  vi.mocked(generateBrowserPhotoVariants).mockImplementation(async (_, sourceKey) => [
    { blob: new Blob(["avif"], { type: "image/avif" }), format: "avif", width: 400, height: 600, byte_size: 4, sha256: "a".repeat(64), storage_path: `${sourceKey}/aaaaaaaa-400.avif` },
    { blob: new Blob(["webp"], { type: "image/webp" }), format: "webp", width: 400, height: 600, byte_size: 4, sha256: "b".repeat(64), storage_path: `${sourceKey}/bbbbbbbb-400.webp` },
  ]);
});
afterEach(cleanup);

describe("Administration Photos sans réseau réel", () => {
  it("prépare les deux fichiers, la photo et l'emplacement avec texte alternatif", async () => {
    renderAdmin();
    await waitFor(() => expect((screen.getByRole("button", { name: "Ajouter à la galerie" }) as HTMLButtonElement).disabled).toBe(false));
    await fillUpload();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(state.uploads).toHaveLength(2);
    expect(state.inserts.map(({ table }) => table)).toEqual(["photos", "photo_variants", "photo_placements"]);
    expect((state.inserts[0].payload as { alt_text: string }).alt_text).toBe("Portrait en lumière naturelle");
    expect((state.inserts[2].payload as { published: boolean }).published).toBe(false);
  });

  it("supprime les fichiers et les lignes simulées si l'insertion des variantes échoue", async () => {
    state.failVariants = true;
    renderAdmin();
    await waitFor(() => expect((screen.getByRole("button", { name: "Ajouter à la galerie" }) as HTMLButtonElement).disabled).toBe(false));
    await fillUpload();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(state.removes[0]).toHaveLength(2);
    expect(state.deletes).toEqual(["photo_placements", "photo_variants", "photos"]);
  });

  it("demande confirmation avant de supprimer fichiers et lignes", async () => {
    state.existingPhoto = true;
    renderAdmin();
    const button = await screen.findByRole("button", { name: "Supprimer" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    vi.mocked(confirmDelete).mockReturnValueOnce(false);
    await userEvent.setup().click(button);
    expect(state.deletes).toHaveLength(0);
    await userEvent.setup().click(button);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(state.deletes).toEqual(["photo_placements", "photo_variants", "photos"]);
    expect(state.removes).toEqual([["galleries/portrait/abc/400.avif", "galleries/portrait/abc/400.webp"]]);
  });
});
