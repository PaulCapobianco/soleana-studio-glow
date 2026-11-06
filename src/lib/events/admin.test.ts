import { describe, expect, it, vi } from "vitest";
import { legacyNoelEvent } from "./legacy-noel";
import { formValuesToUpdate, previewContent, rowToFormValues } from "./admin";
import { validateEventForPublish } from "./validation";
import type { EventRow } from "./types";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const row = legacyNoelEvent() as unknown as EventRow;

describe("conversion ligne ↔ formulaire", () => {
  it("l'événement Noël 2026 est publiable tel quel", () => {
    expect(validateEventForPublish(rowToFormValues(row))).toEqual({});
  });
  it("aller-retour sans perte sur les champs de contenu", () => {
    const update = formValuesToUpdate(rowToFormValues(row));
    expect(update).toMatchObject({
      title: row.title,
      slug: row.slug,
      event_dates: row.event_dates,
      fallback_dates: row.fallback_dates,
      description: row.description,
      faq: row.faq,
      formules: row.formules,
    });
  });
  it("nettoie les espaces et les lignes vides, trie les dates", () => {
    const values = rowToFormValues(row);
    const update = formValuesToUpdate({
      ...values,
      title: "  Titre  ",
      event_dates: ["2026-11-29", "2026-11-28"],
      experience_steps: ["  a ", "", "b"],
      booking_url: "  ",
    });
    expect(update.title).toBe("Titre");
    expect(update.event_dates).toEqual(["2026-11-28", "2026-11-29"]);
    expect(update.experience_steps).toEqual(["a", "b"]);
    expect(update.booking_url).toBeNull();
  });
  it("l'aperçu applique les valeurs saisies sans toucher à la ligne d'origine", () => {
    const preview = previewContent(row, { ...rowToFormValues(row), title: "Autre titre" });
    expect(preview.title).toBe("Autre titre");
    expect(row.title).toBe("Mini-séances de Noël 2026");
  });
});
