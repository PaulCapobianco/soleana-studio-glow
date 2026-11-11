import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./supabase-pagination";

const table = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));
const source =
  (rows: { id: number }[], cap = 1000) =>
  (from: number, to: number) =>
    Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + cap)), error: null });

describe("fetchAllRows", () => {
  it("lit les 1 360 variantes malgré le plafond de 1 000 lignes", async () => {
    const rows = await fetchAllRows(source(table(1360)));
    expect(rows).toHaveLength(1360);
    expect(rows[1359].id).toBe(1359);
  });
  it("s'arrête sur une page incomplète, y compris vide", async () => {
    expect(await fetchAllRows(source(table(0)))).toEqual([]);
    expect(await fetchAllRows(source(table(999)))).toHaveLength(999);
  });
  it("gère un nombre de lignes multiple exact de la taille de page", async () => {
    expect(await fetchAllRows(source(table(2000)))).toHaveLength(2000);
  });
  it("propage l'erreur Supabase sans résultat partiel", async () => {
    const boom = { code: "42501", message: "denied" };
    await expect(
      fetchAllRows(async (from) =>
        from === 0 ? { data: table(1000), error: null } : { data: null, error: boom },
      ),
    ).rejects.toBe(boom);
  });
  it("refuse de boucler indéfiniment", async () => {
    await expect(fetchAllRows(source(table(100)), 10, 3)).rejects.toThrow(/pagination interrompue/);
  });
});
