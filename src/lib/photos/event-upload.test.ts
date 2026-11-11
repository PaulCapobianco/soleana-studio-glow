import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { coverStoragePath } from "@/lib/events/admin";
import { uploadEventPhoto, type EventUploadDeps } from "./event-upload";

type Call = { op: string; table?: string; payload?: unknown; path?: string; eq?: unknown };

function fakeDeps(
  opts: {
    failOn?: "variants" | "placement" | "upload2";
    canUpload?: boolean;
    percent?: number | null;
  } = {},
) {
  const calls: Call[] = [];
  const result = (op: string, table: string, payload?: unknown) => {
    calls.push({ op, table, payload });
    const fail =
      (opts.failOn === "variants" && table === "photo_variants" && op === "insert") ||
      (opts.failOn === "placement" && table === "photo_placements" && op === "insert");
    return Promise.resolve({ error: fail ? { code: "XX", message: "boom" } : null });
  };
  let uploads = 0;
  const client = {
    storage: {
      from: () => ({
        upload: (path: string) => {
          uploads += 1;
          calls.push({ op: "upload", path });
          return Promise.resolve({
            error: opts.failOn === "upload2" && uploads === 2 ? { message: "no space" } : null,
          });
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/photos/${path}` },
        }),
        remove: (paths: string[]) => (
          calls.push({ op: "remove", path: paths.join(",") }),
          Promise.resolve({ error: null })
        ),
      }),
    },
    from: (table: string) => ({
      insert: (payload: unknown) => {
        const r = result("insert", table, payload);
        const chain = Object.assign(r, {
          select: () => ({
            single: () => Promise.resolve({ data: { id: "photo-1" }, error: null }),
          }),
        });
        return chain;
      },
      delete: () => ({
        eq: (_c: string, v: unknown) => (
          calls.push({ op: "delete", table, eq: v }),
          Promise.resolve({ error: null })
        ),
      }),
    }),
  };
  const blob = new Blob(["x"]);
  const deps: EventUploadDeps = {
    validate: async () => "jpeg",
    generate: async (_f, key) =>
      [400, 1600].flatMap((width) =>
        (["avif", "webp"] as const).map((format) => ({
          storage_path: `${key}/abcdef12-${width}.${format}`,
          blob,
          format,
          width,
          height: Math.round(width * 0.66),
          byte_size: 1000,
          sha256: "a".repeat(64),
        })),
      ),
    capacity: async () => ({
      canUpload: opts.canUpload ?? true,
      projectedPercent: opts.percent ?? null,
    }),
    client: client as never,
  };
  return { deps, calls };
}

const input = {
  file: new File(["x"], "p.jpg", { type: "image/jpeg" }),
  alt: "Famille — Noël",
  eventId: "e-1",
  eventSlug: "noel-2027",
  slot: "galerie-1",
  displayOrder: 3,
};

describe("uploadEventPhoto", () => {
  it("envoie les variantes puis crée photo, variantes et emplacement de contexte « event »", async () => {
    const { deps, calls } = fakeDeps();
    const r = await uploadEventPhoto(input, deps);
    expect(r.photoId).toBe("photo-1");
    expect(calls.filter((c) => c.op === "upload")).toHaveLength(4);
    const photoInsert = calls.find((c) => c.table === "photos" && c.op === "insert")!
      .payload as Record<string, unknown>;
    expect(photoInsert).toMatchObject({
      alt_text: "Famille — Noël",
      category_id: null,
      on_home: false,
      on_portfolio: false,
      published: true,
    });
    expect(photoInsert.source_key).toMatch(/^galleries\/evenement\/[a-f0-9]{32}$/);
    const placement = calls.find((c) => c.table === "photo_placements" && c.op === "insert")!
      .payload as Record<string, unknown>;
    expect(placement).toMatchObject({
      context_type: "event",
      event_id: "e-1",
      slot: "galerie-1",
      display_order: 3,
      published: true,
    });
    expect(placement.placement_key).toMatch(/^events\/noel-2027\/galerie-1\/[a-f0-9]{32}$/);
  });

  it("les chemins envoyés respectent la convention des politiques Storage", async () => {
    const { deps, calls } = fakeDeps();
    await uploadEventPhoto(input, deps);
    const re =
      /^galleries\/[a-z0-9][a-z0-9_-]*\/[a-f0-9]{12,32}\/[a-f0-9]{8}-(400|800|1200|1600|[1-9][0-9]{0,2}|1[0-5][0-9]{2})\.(avif|webp)$/;
    for (const c of calls.filter((x) => x.op === "upload")) expect(c.path).toMatch(re);
  });

  it("échec en cours de route : tout ce qui a été créé est supprimé", async () => {
    const { deps, calls } = fakeDeps({ failOn: "placement" });
    await expect(uploadEventPhoto(input, deps)).rejects.toBeTruthy();
    expect(calls.filter((c) => c.op === "delete").map((c) => c.table)).toEqual([
      "photo_placements",
      "photo_variants",
      "photos",
    ]);
    expect(calls.find((c) => c.op === "remove")?.path?.split(",")).toHaveLength(4);
  });

  it("échec pendant l'envoi des fichiers : les fichiers déjà envoyés sont retirés, aucune ligne créée", async () => {
    const { deps, calls } = fakeDeps({ failOn: "upload2" });
    await expect(uploadEventPhoto(input, deps)).rejects.toBeTruthy();
    expect(calls.find((c) => c.op === "remove")?.path?.split(",")).toHaveLength(1);
    expect(calls.some((c) => c.table === "photos")).toBe(false);
  });

  it("refuse sans description, ou si l'espace serait dépassé, sans rien envoyer", async () => {
    const a = fakeDeps();
    await expect(uploadEventPhoto({ ...input, alt: " " }, a.deps)).rejects.toThrow(/Décrivez/);
    const b = fakeDeps({ canUpload: false });
    await expect(uploadEventPhoto(input, b.deps)).rejects.toThrow(/espace photo/);
    expect(b.calls).toEqual([]);
  });

  it("signale un stockage presque plein", async () => {
    const { deps } = fakeDeps({ percent: 91.234 });
    expect((await uploadEventPhoto(input, deps)).warning).toMatch(/91\.2 %/);
  });
});

describe("chemins Storage et migration 20260926000005", () => {
  const sql = readFileSync(
    "supabase/migrations/20260926000005_photo_storage_admin_operations.sql",
    "utf8",
  );
  const policies = sql.slice(0, sql.indexOf("CREATE TABLE public.photo_storage_cleanup_jobs"));
  const coverRegex = new RegExp(
    /name ~ '(\^events\/[^']*)'/.exec(policies)![1].replace(/\\\./g, "\\."),
  );

  it("accepte la couverture d'un événement telle que l'admin la nomme", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(coverStoragePath(uuid, 800, Date.now())).toMatch(coverRegex);
    expect(coverStoragePath(uuid, 1600, 1_762_000_000_000)).toMatch(coverRegex);
  });
  it("refuse les autres chemins sous events/", () => {
    expect("events/x/cover-800-1762000000000.webp").not.toMatch(coverRegex);
    expect("events/123e4567-e89b-12d3-a456-426614174000/autre.webp").not.toMatch(coverRegex);
    expect("events/123e4567-e89b-12d3-a456-426614174000/cover-500-1762000000000.webp").not.toMatch(
      coverRegex,
    );
  });
  it("les quatre politiques d'envoi/modification acceptent les couvertures", () => {
    expect(policies.match(/events\/\[0-9a-f\]\{8\}/g)).toHaveLength(4);
  });
});

describe("migrations de galeries d'événements", () => {
  it("000003 porte le contexte event, event_id, l'index d'ordre et la lecture limitée aux événements publiés", () => {
    const sql = readFileSync(
      "supabase/migrations/20260926000003_add_photo_variants_and_placements.sql",
      "utf8",
    );
    expect(sql).toContain("context_type IN ('page', 'seo', 'category', 'event')");
    expect(sql).toContain("event_id UUID NULL REFERENCES public.events(id) ON DELETE RESTRICT");
    expect(sql).toContain("photo_placements_event_order");
    expect(sql).toContain("e.status = 'published'");
  });
  it("20261110 ajoute galleries et la référence, sans effet sur les lignes existantes", () => {
    const sql = readFileSync("supabase/migrations/20261110000000_event_galleries.sql", "utf8");
    expect(sql).toContain("galleries JSONB NOT NULL DEFAULT '[]'::jsonb");
    expect(sql).toContain("gallery_reference_event_id UUID NULL");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).not.toMatch(/DROP |DELETE FROM|UPDATE public/);
  });
});
