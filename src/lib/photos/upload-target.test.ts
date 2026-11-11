import { describe, expect, it } from "vitest";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import {
  describeEventUsage,
  eventGalleryChoices,
  planEventUpload,
  type EventTargetOption,
} from "./upload-target";

const events: EventTargetOption[] = [
  {
    id: "e1",
    slug: "noel-2026",
    title: "Noël 2026",
    galleries: [
      { slot: "galerie-1", title: "Édition 2025" },
      { slot: "galerie-2", title: "Coulisses" },
    ],
  },
  { id: "e2", slug: "vide", title: "Sans galerie", galleries: [] },
];
const placements = [
  { event_id: "e1", slot: "galerie-1", display_order: 0 },
  { event_id: "e1", slot: "galerie-1", display_order: 1 },
  { event_id: "e1", slot: "galerie-2", display_order: 5 },
];

describe("eventGalleryChoices", () => {
  it("liste les galeries de l'événement, vide s'il n'en a pas ou s'il est inconnu", () => {
    expect(eventGalleryChoices(events, "e1").map((g) => g.slot)).toEqual([
      "galerie-1",
      "galerie-2",
    ]);
    expect(eventGalleryChoices(events, "e2")).toEqual([]);
    expect(eventGalleryChoices(events, "zz")).toEqual([]);
  });
});

describe("planEventUpload", () => {
  const base = { events, placements, eventId: "e1", slot: "galerie-1", orderInput: "" };

  it("prend le prochain ordre de la galerie choisie", () => {
    expect(planEventUpload(base)).toMatchObject({
      eventSlug: "noel-2026",
      galleryTitle: "Édition 2025",
      displayOrder: 2,
    });
    expect(planEventUpload({ ...base, slot: "galerie-2" }).displayOrder).toBe(6);
  });

  it("accepte un ordre libre non utilisé", () => {
    expect(planEventUpload({ ...base, orderInput: " 10 " }).displayOrder).toBe(10);
  });

  it("refuse un ordre déjà pris ou invalide", () => {
    for (const orderInput of ["1", "-1", "1.5", "abc"]) {
      expect(() => planEventUpload({ ...base, orderInput })).toThrow(AdminValidationError);
    }
  });

  it("refuse un événement ou une galerie inconnus, avec un message pour la photographe", () => {
    expect(() => planEventUpload({ ...base, eventId: "" })).toThrow("Choisissez un événement.");
    expect(() => planEventUpload({ ...base, slot: "autre" })).toThrow(/Choisissez une galerie/);
    expect(() => planEventUpload({ ...base, eventId: "e2" })).toThrow(/Choisissez une galerie/);
  });
});

describe("describeEventUsage", () => {
  it("nomme l'événement et la galerie, sans doublon", () => {
    expect(describeEventUsage(events, placements)).toEqual([
      "Noël 2026 · Édition 2025",
      "Noël 2026 · Coulisses",
    ]);
    expect(describeEventUsage(events, [{ event_id: "?", slot: "x", display_order: 0 }])).toEqual(
      [],
    );
  });
});
