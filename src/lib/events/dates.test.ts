import { describe, expect, it } from "vitest";
import {
  editionEndsAt,
  formatFallbackSentence,
  formatHeroDates,
  formatLongDate,
  formatTeaserDates,
  isEditionOver,
  isIsoDate,
} from "./dates";

// Les libellés ci-dessous sont ceux qui étaient codés en dur pour Noël 2026 : la génération
// automatique doit les reproduire à l'identique.
describe("formatage des dates (Noël 2026)", () => {
  const main = ["2026-11-28", "2026-11-29"];
  const fallback = ["2026-12-05", "2026-12-06"];

  it("libellé long d'un jour", () => {
    expect(formatLongDate("2026-11-28")).toBe("Samedi 28 novembre 2026");
    expect(formatLongDate("2026-11-29")).toBe("Dimanche 29 novembre 2026");
  });
  it("bandeau du haut de page", () => {
    expect(formatHeroDates(main)).toBe("Samedi 28 et dimanche 29 novembre");
  });
  it("teaser d'accueil", () => {
    expect(formatTeaserDates(main)).toBe("28 & 29 novembre 2026");
  });
  it("phrase de report météo", () => {
    expect(formatFallbackSentence(fallback)).toBe(
      "En cas de mauvais temps, les séances sont reportées aux 5 et 6 décembre (samedi 5 et dimanche 6 décembre 2026).",
    );
  });
});

describe("formatage des dates (autres cas)", () => {
  it("une seule date, un seul report", () => {
    expect(formatHeroDates(["2027-03-14"])).toBe("Dimanche 14 mars");
    expect(formatFallbackSentence(["2027-03-21"])).toBe(
      "En cas de mauvais temps, les séances sont reportées au 21 mars (dimanche 21 mars 2027).",
    );
  });
  it("dates sur deux mois et deux années", () => {
    expect(formatHeroDates(["2026-11-28", "2026-12-05"])).toBe(
      "Samedi 28 novembre et samedi 5 décembre",
    );
    expect(formatTeaserDates(["2026-12-27", "2027-01-03"])).toBe("27 décembre & 3 janvier");
  });
  it("ordre indifférent, doublons et valeurs invalides ignorés", () => {
    expect(formatTeaserDates(["2026-11-29", "2026-11-28", "2026-11-28", "pas-une-date"])).toBe(
      "28 & 29 novembre 2026",
    );
  });
  it("le premier du mois", () => {
    expect(formatLongDate("2027-05-01")).toBe("Samedi 1er mai 2027");
  });
  it("aucune date", () => {
    expect(formatHeroDates([])).toBe("");
    expect(formatTeaserDates([])).toBe("");
    expect(formatFallbackSentence([])).toBe("");
  });
});

describe("isIsoDate", () => {
  it("accepte les vraies dates et refuse le reste", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("28/11/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("fin d'édition", () => {
  const main = ["2026-11-28", "2026-11-29"];
  const fallback = ["2026-12-05", "2026-12-06"];

  it("minuit à Paris après la dernière date de report (même instant que l'ancien code)", () => {
    expect(editionEndsAt(main, fallback)?.toISOString()).toBe(
      new Date("2026-12-07T00:00:00+01:00").toISOString(),
    );
  });
  it("tient compte de l'heure d'été", () => {
    expect(editionEndsAt(["2027-07-10"], [])?.toISOString()).toBe("2027-07-10T22:00:00.000Z");
  });
  it("bascule exactement à l'instant de fin", () => {
    expect(isEditionOver(main, fallback, new Date("2026-12-06T22:59:59Z"))).toBe(false);
    expect(isEditionOver(main, fallback, new Date("2026-12-06T23:00:00Z"))).toBe(true);
  });
  it("sans date, l'édition n'est jamais terminée", () => {
    expect(isEditionOver([], [], new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});
