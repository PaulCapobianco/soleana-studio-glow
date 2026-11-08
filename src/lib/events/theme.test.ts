import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_NODES } from "./icon-data";
import { BULLET_ICON_IDS, LUCIDE_ICON_IDS, MAIN_ICON_IDS } from "./icons";
import { ICON_LABELS } from "./icon-labels";
import {
  CREAM,
  MIN_ACCENT_ON_PAPER,
  MIN_GRAPHIC_CONTRAST,
  MIN_TEXT_CONTRAST,
  PAPER,
  THEMES,
  THEME_IDS,
  checkAccent,
  contrastRatio,
  deriveAccentText,
  resolveThemeTokens,
} from "./theme";

describe.each(THEMES.map((t) => [t.id, t] as const))("thème %s", (_id, theme) => {
  it("texte crème sur la couleur principale (boutons, sections nuit, pastille) : AA", () => {
    expect(contrastRatio(CREAM, theme.primary)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
  it("couleur principale sur le papier et sur la crème (texte, liens, boutons au survol) : AA", () => {
    expect(contrastRatio(theme.primary, PAPER)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(theme.primary, CREAM)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
  it("petit texte d'accent sur la couleur principale : AA", () => {
    expect(contrastRatio(theme.accentText, theme.primary)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });
  it("accent visible sur la couleur principale et sur le papier", () => {
    expect(contrastRatio(theme.accent, theme.primary)).toBeGreaterThanOrEqual(MIN_GRAPHIC_CONTRAST);
    expect(contrastRatio(theme.accent, PAPER)).toBeGreaterThanOrEqual(MIN_ACCENT_ON_PAPER);
  });
});

describe("thème par défaut", () => {
  it("reproduit exactement l'apparence actuelle de Noël 2026", () => {
    expect(THEMES[0]).toMatchObject({
      id: "noel-classique",
      primary: "#5E1112",
      accent: "#C6966F",
      accentText: "#E3C4A4",
    });
    expect(resolveThemeTokens("noel-classique", null)).toEqual({
      primary: "#5E1112",
      accent: "#C6966F",
      accentText: "#E3C4A4",
    });
  });
  it("un identifiant inconnu retombe sur le thème par défaut", () => {
    expect(resolveThemeTokens("n-importe-quoi", null).primary).toBe("#5E1112");
  });
});

describe("couleur d'accent personnalisée", () => {
  it("refuse une couleur trop sombre pour le fond foncé et propose une nuance lisible", () => {
    const check = checkAccent("noel-classique", "#3A0A0B");
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.suggestion).not.toBeNull();
      expect(checkAccent("noel-classique", check.suggestion!).ok).toBe(true);
    }
  });
  it("refuse une couleur trop claire pour le papier et propose une nuance lisible", () => {
    const check = checkAccent("hiver", "#FFFFFF");
    expect(check.ok).toBe(false);
    if (!check.ok) expect(checkAccent("hiver", check.suggestion!).ok).toBe(true);
  });
  it("accepte une couleur correcte et en déduit un texte d'accent AA", () => {
    const tokens = resolveThemeTokens("sapin", "#e0a030");
    expect(tokens.accent).toBe("#E0A030");
    expect(contrastRatio(tokens.accentText, tokens.primary)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });
  it("ignore une couleur illisible plutôt que de l'afficher", () => {
    expect(resolveThemeTokens("noel-classique", "#000000").accent).toBe("#C6966F");
    expect(resolveThemeTokens("noel-classique", "pas-une-couleur").accent).toBe("#C6966F");
  });
  it("deriveAccentText atteint toujours AA", () => {
    for (const t of THEMES) {
      expect(
        contrastRatio(deriveAccentText("#808080", t.primary), t.primary),
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe("icônes", () => {
  it("chaque icône proposée a un tracé et un libellé", () => {
    for (const id of LUCIDE_ICON_IDS) {
      expect(ICON_NODES[id]?.length, id).toBeGreaterThan(0);
      expect(ICON_LABELS[id], id).toBeTruthy();
    }
    for (const id of BULLET_ICON_IDS) expect(ICON_LABELS[id], id).toBeTruthy();
  });
});

describe("migration d'apparence ↔ code", () => {
  const sql = readFileSync("supabase/migrations/20261108000000_add_event_appearance.sql", "utf8");
  const listAfter = (column: string) => {
    const m = new RegExp(`${column}\\s+IN\\s*\\(([^)]*)\\)`).exec(sql);
    return (m?.[1].match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));
  };
  it("les thèmes autorisés par la base sont ceux du code", () => {
    expect(listAfter("theme")).toEqual([...THEME_IDS]);
  });
  it("les icônes autorisées par la base sont celles du code", () => {
    expect(listAfter("icon_main")).toEqual([...MAIN_ICON_IDS]);
    expect(listAfter("icon_bullet")).toEqual([...BULLET_ICON_IDS]);
  });
});
