import { describe, expect, it, vi } from "vitest";
import type { EventRow } from "./types";

type Call = { table: string; op: string; payload?: unknown; eq?: [string, unknown] };
const state: {
  calls: Call[];
  sourcePlacements: unknown[];
  failPlacementInsert: boolean;
  slugs: string[];
} = {
  calls: [],
  sourcePlacements: [],
  failPlacementInsert: false,
  slugs: [],
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    from(table: string) {
      let op = "select";
      let payload: unknown;
      const q: Record<string, unknown> = {
        select: () => q,
        like: () => Promise.resolve({ data: state.slugs.map((slug) => ({ slug })), error: null }),
        insert: (p: unknown) => {
          op = "insert";
          payload = p;
          state.calls.push({ table, op, payload });
          if (table === "photo_placements")
            return Promise.resolve({ error: state.failPlacementInsert ? { message: "x" } : null });
          return q;
        },
        single: () =>
          Promise.resolve({
            data: {
              ...(payload as object),
              id: "new-id",
              slug: (payload as { slug: string }).slug,
            },
            error: null,
          }),
        delete: () => ((op = "delete"), q),
        eq: (c: string, v: unknown) => {
          if (op === "select" && table === "photo_placements") return q;
          state.calls.push({ table, op, eq: [c, v] });
          return Promise.resolve({ error: null });
        },
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: op === "select" ? state.sourcePlacements : null, error: null }),
      };
      return q;
    },
  },
}));

import { duplicateEvent } from "./admin";

const source = {
  id: "src-id",
  slug: "noel-2026",
  title: "Noël 2026",
  subtitle: "",
  description: "",
  location: "",
  edition_label: "",
  experience_steps: [],
  closing_title: "",
  event_dates: ["2026-11-28"],
  fallback_dates: [],
  availability_note: "",
  formules: [],
  faq: [],
  booking_url: null,
  cover_image_url: null,
  cover_image_small_url: null,
  cover_image_alt: "",
  ended_title: "",
  ended_text: "",
  show_teaser: true,
  teaser_title: "",
  teaser_text: "",
  teaser_cta: "",
  meta_title: "",
  meta_description: "",
  og_title: "",
  og_description: "",
  theme: "noel-classique",
  accent_color: null,
  icon_main: "etoile-noel",
  icon_bullet: "defaut",
  galleries: [{ slot: "galerie-1", title: "Famille" }],
  gallery_reference_event_id: null,
  status: "published",
  first_published_at: "2026-11-01T00:00:00Z",
  display_order: 1,
  created_at: "x",
  updated_at: "x",
} as unknown as EventRow;

const reset = () =>
  Object.assign(state, { calls: [], sourcePlacements: [], failPlacementInsert: false, slugs: [] });
const eventInsert = () =>
  state.calls.find((c) => c.table === "events" && c.op === "insert")!.payload as Record<
    string,
    unknown
  >;

describe("duplicateEvent : galeries", () => {
  it("« none » : pas de galerie, pas de colonnes de galeries envoyées (marche avant la migration)", async () => {
    reset();
    await duplicateEvent(source);
    const p = eventInsert();
    expect(p).not.toHaveProperty("galleries");
    expect(p).not.toHaveProperty("gallery_reference_event_id");
    expect(p).toMatchObject({
      status: "draft",
      show_teaser: false,
      event_dates: [],
      title: "Noël 2026 (copie)",
    });
    expect(state.calls.some((c) => c.table === "photo_placements")).toBe(false);
  });

  it("« reference » : la copie pointe vers l'original, sans copier de photos", async () => {
    reset();
    await duplicateEvent(source, "reference");
    expect(eventInsert()).toMatchObject({ gallery_reference_event_id: "src-id" });
    expect(eventInsert()).not.toHaveProperty("galleries");
    expect(state.calls.some((c) => c.table === "photo_placements")).toBe(false);
  });

  it("« copy » : mêmes galeries, nouveaux emplacements vers les mêmes photos, clés uniques", async () => {
    reset();
    state.sourcePlacements = [
      {
        photo_id: "p1",
        slot: "galerie-1",
        display_order: 0,
        object_position_x_pct: 40,
        object_position_y_pct: 60,
        alt_text_override: "x",
        published: true,
      },
      {
        photo_id: "p2",
        slot: "galerie-1",
        display_order: 1,
        object_position_x_pct: 50,
        object_position_y_pct: 50,
        alt_text_override: null,
        published: false,
      },
    ];
    await duplicateEvent(source, "copy");
    expect(eventInsert()).toMatchObject({ galleries: source.galleries });
    const rows = state.calls.find((c) => c.table === "photo_placements" && c.op === "insert")!
      .payload as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(
      rows.map((r) => [
        r.photo_id,
        r.slot,
        r.display_order,
        r.published,
        r.event_id,
        r.context_type,
      ]),
    ).toEqual([
      ["p1", "galerie-1", 0, true, "new-id", "event"],
      ["p2", "galerie-1", 1, false, "new-id", "event"],
    ]);
    expect(rows[0]).toMatchObject({ object_position_x_pct: 40, alt_text_override: "x" });
    expect(new Set(rows.map((r) => r.placement_key)).size).toBe(2);
    expect(rows[0].placement_key).toMatch(/^events\/noel-2026-copie\/galerie-1\/[a-f0-9]{32}$/);
  });

  it("« copy » en échec : l'événement créé est retiré, message clair", async () => {
    reset();
    state.sourcePlacements = [
      {
        photo_id: "p1",
        slot: "galerie-1",
        display_order: 0,
        object_position_x_pct: 50,
        object_position_y_pct: 50,
        alt_text_override: null,
        published: true,
      },
    ];
    state.failPlacementInsert = true;
    await expect(duplicateEvent(source, "copy")).rejects.toThrow(/rien n'a été créé/);
    expect(state.calls.filter((c) => c.op === "delete").map((c) => [c.table, c.eq])).toEqual([
      ["photo_placements", ["event_id", "new-id"]],
      ["events", ["id", "new-id"]],
    ]);
  });
});
