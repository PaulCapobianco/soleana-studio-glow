import { describe, expect, it } from "vitest";
import { legacyNoelEvent } from "./legacy-noel";
import { nextEventDate, parisToday } from "./dates";
import { pickTeaserEvent } from "./teaser-selection";
import type { EventContent } from "./types";

const make = (slug: string, over: Partial<EventContent>): EventContent => ({
  ...legacyNoelEvent(),
  id: slug,
  slug,
  status: "published",
  show_teaser: true,
  display_order: 0,
  created_at: "2026-11-01T00:00:00Z",
  fallback_dates: [],
  ...over,
});

const NOW = new Date("2026-11-08T10:00:00Z"); // 8 novembre 2026, 11 h à Paris

describe("pickTeaserEvent", () => {
  it("deux événements éligibles : celui dont la prochaine date est la plus proche, quel que soit l'ordre", () => {
    const noel = make("noel", { event_dates: ["2026-11-28", "2026-11-29"], display_order: 1 });
    const test = make("test", { event_dates: ["2026-11-10"], display_order: 2 });
    expect(pickTeaserEvent([noel, test], NOW)?.slug).toBe("test");
    expect(pickTeaserEvent([test, noel], NOW)?.slug).toBe("test");
  });

  it("même prochaine date : display_order départage (le plus petit d'abord)", () => {
    const a = make("a", { event_dates: ["2026-11-20"], display_order: 5 });
    const b = make("b", { event_dates: ["2026-11-20"], display_order: 2 });
    expect(pickTeaserEvent([a, b], NOW)?.slug).toBe("b");
  });

  it("même date et même ordre : le plus récemment créé, résultat stable", () => {
    const old = make("old", { event_dates: ["2026-11-20"], created_at: "2026-10-01T00:00:00Z" });
    const recent = make("recent", {
      event_dates: ["2026-11-20"],
      created_at: "2026-11-05T00:00:00Z",
    });
    expect(pickTeaserEvent([old, recent], NOW)?.slug).toBe("recent");
    expect(pickTeaserEvent([recent, old], NOW)?.slug).toBe("recent");
  });

  it("les dates de report comptent comme prochaine date", () => {
    // séances passées, report à venir : l'édition n'est pas terminée et sa prochaine date est le report
    const withFallback = make("report", {
      event_dates: ["2026-11-01"],
      fallback_dates: ["2026-11-12"],
    });
    const later = make("later", { event_dates: ["2026-11-20"] });
    expect(nextEventDate(withFallback.event_dates, withFallback.fallback_dates, NOW)).toBe(
      "2026-11-12",
    );
    expect(pickTeaserEvent([later, withFallback], NOW)?.slug).toBe("report");
  });

  it("une édition terminée est exclue, même avec le plus petit ordre", () => {
    const over = make("over", {
      event_dates: ["2026-11-01"],
      fallback_dates: ["2026-11-02"],
      display_order: 0,
    });
    const upcoming = make("upcoming", { event_dates: ["2026-12-01"], display_order: 9 });
    expect(pickTeaserEvent([over, upcoming], NOW)?.slug).toBe("upcoming");
  });

  it("le jour de la dernière date, l'édition est encore affichée ; le lendemain à minuit (Paris), non", () => {
    const e = make("jour-j", { event_dates: ["2026-11-08"] });
    expect(pickTeaserEvent([e], new Date("2026-11-08T22:30:00Z"))?.slug).toBe("jour-j"); // 23 h 30 à Paris
    expect(pickTeaserEvent([e], new Date("2026-11-08T23:00:00Z"))).toBeNull(); // minuit à Paris
  });

  it("aucun événement éligible : pas de teaser", () => {
    expect(pickTeaserEvent([], NOW)).toBeNull();
    const sansTeaser = make("a", { event_dates: ["2026-11-20"], show_teaser: false });
    const brouillon = make("b", { event_dates: ["2026-11-20"], status: "draft" });
    const archive = make("c", { event_dates: ["2026-11-20"], status: "archived" });
    const termine = make("d", { event_dates: ["2026-10-01"] });
    expect(pickTeaserEvent([sansTeaser, brouillon, archive, termine], NOW)).toBeNull();
  });

  it("un événement sans aucune date n'est jamais choisi", () => {
    expect(
      pickTeaserEvent([make("vide", { event_dates: [], fallback_dates: [] })], NOW),
    ).toBeNull();
  });
});

describe("parisToday", () => {
  it("donne le jour de Paris, pas celui d'UTC", () => {
    expect(parisToday(new Date("2026-11-08T23:30:00Z"))).toBe("2026-11-09");
    expect(parisToday(new Date("2026-07-08T22:30:00Z"))).toBe("2026-07-09");
    expect(parisToday(new Date("2026-11-08T10:00:00Z"))).toBe("2026-11-08");
  });
});
