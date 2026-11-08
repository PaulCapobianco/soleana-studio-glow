import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import {
  PROTECTED_CATEGORY_SLUGS,
  categoryError,
  categorySlugFor,
  deleteBlockReason,
  moveCategory,
  validateCategoryName,
} from "./categories";

const cat = (id: string, order: number, slug = id) => ({
  id,
  slug,
  name: id,
  display_order: order,
});

describe("validateCategoryName", () => {
  it("accepte un nom normal, refuse vide, trop long ou sans lettre", () => {
    expect(validateCategoryName("Mariage en été")).toBeNull();
    expect(validateCategoryName("  ")).toMatch(/nom/);
    expect(validateCategoryName("x".repeat(81))).toMatch(/trop long/);
    expect(validateCategoryName("!!!")).toMatch(/lettre/);
  });
});

describe("categorySlugFor", () => {
  it("génère une adresse sans accents et évite les doublons", () => {
    expect(categorySlugFor("Mariage en été", [])).toBe("mariage-en-ete");
    expect(categorySlugFor("Couple", ["couple"])).toBe("couple-2");
    expect(categorySlugFor("Couple", ["couple", "couple-2"])).toBe("couple-3");
  });
});

describe("moveCategory", () => {
  const list = [cat("a", 1), cat("b", 2), cat("c", 3)];
  it("échange deux catégories voisines et ne renvoie que les lignes modifiées", () => {
    expect(moveCategory(list, "b", -1)).toEqual([
      { id: "b", display_order: 1 },
      { id: "a", display_order: 2 },
    ]);
  });
  it("refuse de sortir de la liste", () => {
    expect(moveCategory(list, "a", -1)).toBeNull();
    expect(moveCategory(list, "c", 1)).toBeNull();
    expect(moveCategory(list, "inconnue", 1)).toBeNull();
  });
  it("renumérote proprement des ordres irréguliers ou en double", () => {
    const messy = [cat("a", 5), cat("b", 5), cat("c", 9)];
    const updates = moveCategory(messy, "c", -1)!;
    const next = Object.fromEntries(updates.map((u) => [u.id, u.display_order]));
    expect(new Set(Object.values({ a: 1, ...next }))).toHaveProperty("size", 3);
  });
});

describe("deleteBlockReason", () => {
  it("bloque les catégories de base et celles qui contiennent des photos", () => {
    expect(deleteBlockReason(cat("x", 1, "couple"), 0)).toMatch(/masquer/);
    expect(deleteBlockReason(cat("x", 1, "mariage"), 3)).toMatch(/3 photos/);
    expect(deleteBlockReason(cat("x", 1, "mariage"), 1)).toMatch(/1 photo :/);
    expect(deleteBlockReason(cat("x", 1, "mariage"), 0)).toBeNull();
  });
});

describe("categoryError", () => {
  it("rend lisibles les erreurs de la base", () => {
    expect(categoryError({ code: "P0001", message: "Texte français." })).toBeInstanceOf(
      AdminValidationError,
    );
    expect(categoryError({ code: "23503" })).toBeInstanceOf(AdminValidationError);
    const other = { code: "XX000" };
    expect(categoryError(other)).toBe(other);
  });
});

describe("migration ↔ code", () => {
  it("les catégories protégées du trigger sont celles du code", () => {
    const sql = readFileSync(
      "supabase/migrations/20261109000000_photo_categories_management.sql",
      "utf8",
    );
    const m = /protected CONSTANT TEXT\[\] := ARRAY\[([^\]]*)\]/.exec(sql);
    const slugs = (m?.[1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
    expect(slugs).toEqual([...PROTECTED_CATEGORY_SLUGS]);
  });
});
