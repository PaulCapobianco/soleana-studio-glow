// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CategoriesAdmin } from "./CategoriesAdmin";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));

type Row = Record<string, unknown>;
const db: {
  categories: Row[];
  photos: Row[];
  calls: { table: string; op: string; payload?: unknown; eq?: unknown }[];
  fail?: { code: string; message: string };
} = {
  categories: [],
  photos: [],
  calls: [],
};

// Faux client : select/insert/update/delete enchaînables, résolus comme le vrai client.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from(table: "categories" | "photos") {
      let op = "select";
      let payload: unknown;
      const q: Record<string, unknown> = {
        select: () => q,
        order: () => q,
        insert: (p: unknown) => ((op = "insert"), (payload = p), q),
        update: (p: unknown) => ((op = "update"), (payload = p), q),
        delete: () => ((op = "delete"), q),
        eq: (_c: string, v: unknown) => {
          db.calls.push({ table, op, payload, eq: v });
          return Promise.resolve({ error: db.fail ?? null });
        },
        then: (resolve: (v: unknown) => void) => {
          if (op === "insert") db.calls.push({ table, op, payload });
          resolve({
            data: op === "select" ? db[table] : null,
            error: op === "insert" ? (db.fail ?? null) : null,
          });
        },
      };
      return q;
    },
  },
}));

const cat = (id: string, slug: string, name: string, order: number, published = true) => ({
  id,
  slug,
  name,
  display_order: order,
  published,
  created_at: "2026-01-01",
});

function setup() {
  db.categories = [
    cat("1", "couple", "Couple", 1),
    cat("2", "mariage", "Mariage", 2),
    cat("3", "vide", "Vide", 3, false),
  ];
  db.photos = [{ category_id: "1" }, { category_id: "1" }, { category_id: "2" }];
  db.calls = [];
  db.fail = undefined;
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CategoriesAdmin />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => cleanup());

describe("CategoriesAdmin", () => {
  it("liste les catégories avec leur nombre de photos et bloque les suppressions interdites", async () => {
    setup();
    await screen.findByDisplayValue("Couple");
    expect(screen.getByText(/2 photos · utilisée par le site/)).toBeTruthy();
    expect(screen.getByText(/0 photo · masquée/)).toBeTruthy();
    const deletes = screen.getAllByRole("button", { name: "Supprimer" }) as HTMLButtonElement[];
    expect(deletes[0].disabled).toBe(true); // couple : catégorie de base
    expect(deletes[1].disabled).toBe(true); // mariage : contient 1 photo
    expect(deletes[2].disabled).toBe(false); // vide, sans photo
    expect(deletes[1].title).toMatch(/1 photo/);
  });

  it("crée une catégorie avec une adresse générée et le dernier ordre", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByDisplayValue("Couple");
    await user.type(screen.getByLabelText(/Nouvelle catégorie/), "Naissance été");
    await user.click(screen.getByRole("button", { name: "+ Créer" }));
    await waitFor(() => expect(db.calls.some((c) => c.op === "insert")).toBe(true));
    expect(db.calls.find((c) => c.op === "insert")?.payload).toEqual({
      name: "Naissance été",
      slug: "naissance-ete",
      display_order: 4,
    });
  });

  it("renomme sans toucher à l'adresse", async () => {
    const user = userEvent.setup();
    setup();
    const input = await screen.findByDisplayValue("Mariage");
    await user.clear(input);
    await user.type(input, "Mariages");
    await user.click(screen.getAllByRole("button", { name: "Renommer" })[1]);
    await waitFor(() => expect(db.calls.some((c) => c.op === "update")).toBe(true));
    expect(db.calls.find((c) => c.op === "update")).toMatchObject({
      payload: { name: "Mariages" },
      eq: "2",
    });
  });

  it("monte une catégorie : échange les deux ordres", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByDisplayValue("Couple");
    await user.click(screen.getByRole("button", { name: "Monter Mariage" }));
    await waitFor(() => expect(db.calls.filter((c) => c.op === "update")).toHaveLength(2));
    expect(
      db.calls
        .filter((c) => c.op === "update")
        .map((c) => [c.eq, (c.payload as Row).display_order])
        .sort(),
    ).toEqual([
      ["1", 2],
      ["2", 1],
    ]);
  });

  it("masque après confirmation, réaffiche sans confirmation", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByDisplayValue("Couple");
    await user.click(screen.getAllByRole("button", { name: "Masquer" })[0]);
    await waitFor(() => expect(db.calls.some((c) => c.op === "update")).toBe(true));
    expect(db.calls[0]).toMatchObject({ payload: { published: false }, eq: "1" });
    expect(window.confirm).toHaveBeenCalledTimes(1);
    db.calls = [];
    await user.click(screen.getByRole("button", { name: "Réafficher" }));
    await waitFor(() => expect(db.calls.some((c) => c.op === "update")).toBe(true));
    expect(db.calls[0]).toMatchObject({ payload: { published: true }, eq: "3" });
  });

  it("supprime une catégorie vide et affiche un message lisible si la base refuse", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByDisplayValue("Couple");
    db.fail = {
      code: "P0001",
      message: "Cette catégorie contient encore des photos : déplacez-les.",
    };
    await user.click(screen.getAllByRole("button", { name: "Supprimer" })[2]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/contient encore des photos/)),
    );
  });

  it("avant la migration (colonne absente) : pas de bouton Masquer, avec une explication", async () => {
    db.categories = [
      { id: "1", slug: "couple", name: "Couple", display_order: 1, created_at: "x" },
    ];
    db.photos = [];
    db.calls = [];
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <CategoriesAdmin />
      </QueryClientProvider>,
    );
    await screen.findByDisplayValue("Couple");
    expect(screen.queryByRole("button", { name: "Masquer" })).toBeNull();
    expect(screen.getByText(/mise à jour de la base de données/)).toBeTruthy();
  });
});
