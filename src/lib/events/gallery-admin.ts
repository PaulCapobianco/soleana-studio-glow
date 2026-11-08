import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import { publicImageUrl } from "@/lib/photo-storage";
import { newGallerySlot, validateGalleryTitle, type EventGalleryDef } from "./galleries";
import type { EventRow } from "./types";

// ---- Fonctions pures (testées) -------------------------------------------------------------

export type PlacementLite = { id: string; display_order: number };

/**
 * Échange l'ordre d'une photo avec sa voisine. La base interdit deux photos au même ordre dans une
 * galerie : l'échange se fait donc en trois écritures (voir movePlacement). null si impossible.
 */
export function swapPlan(
  items: readonly PlacementLite[],
  id: string,
  delta: -1 | 1,
): { a: PlacementLite; b: PlacementLite } | null {
  const sorted = [...items].sort((x, y) => x.display_order - y.display_order);
  const index = sorted.findIndex((p) => p.id === id);
  const other = sorted[index + delta];
  if (index === -1 || !other) return null;
  return { a: sorted[index], b: other };
}

export function nextPlacementOrder(items: readonly PlacementLite[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map((p) => p.display_order)) + 1;
}

/** Galeries après ajout d'une galerie (le titre est validé ; l'identifiant est généré). */
export function addGalleryDef(defs: readonly EventGalleryDef[], title: string): EventGalleryDef[] {
  const problem = validateGalleryTitle(title);
  if (problem) throw new AdminValidationError(problem);
  return [...defs, { slot: newGallerySlot(defs), title: title.trim() }];
}

export function renameGalleryDef(
  defs: readonly EventGalleryDef[],
  slot: string,
  title: string,
): EventGalleryDef[] {
  const problem = validateGalleryTitle(title);
  if (problem) throw new AdminValidationError(problem);
  return defs.map((d) => (d.slot === slot ? { ...d, title: title.trim() } : d));
}

export function moveGalleryDef(
  defs: readonly EventGalleryDef[],
  slot: string,
  delta: -1 | 1,
): EventGalleryDef[] {
  const index = defs.findIndex((d) => d.slot === slot);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= defs.length) return [...defs];
  const next = [...defs];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// ---- Accès base (admin) -------------------------------------------------------------------

export type AdminGalleryPhoto = {
  placementId: string;
  photoId: string;
  slot: string;
  displayOrder: number;
  published: boolean;
  alt: string;
  thumbUrl: string | null;
};

type PlacementRow = {
  id: string;
  slot: string;
  display_order: number;
  published: boolean;
  alt_text_override: string | null;
  photo: {
    id: string;
    alt_text: string;
    photo_variants: { width: number; storage_path: string; format: string }[];
  } | null;
};

/** Toutes les photos des galeries d'un événement, publiées ou non (l'admin voit tout). */
export async function listEventPlacements(eventId: string): Promise<AdminGalleryPhoto[]> {
  const { data, error } = await supabase
    .from("photo_placements")
    .select(
      "id, slot, display_order, published, alt_text_override, photo:photos!inner(id, alt_text, photo_variants(width, storage_path, format))",
    )
    .eq("event_id", eventId)
    .eq("context_type", "event")
    .order("display_order");
  if (error) throw error;
  return ((data ?? []) as unknown as PlacementRow[]).map((row) => {
    const webp = (row.photo?.photo_variants ?? [])
      .filter((v) => v.format === "webp")
      .sort((a, b) => a.width - b.width);
    return {
      placementId: row.id,
      photoId: row.photo?.id ?? "",
      slot: row.slot,
      displayOrder: row.display_order,
      published: row.published,
      alt: row.alt_text_override ?? row.photo?.alt_text ?? "",
      thumbUrl: webp[0] ? publicImageUrl(webp[0].storage_path) : null,
    };
  });
}

/** L'identifiant de la catégorie « evenement » (rangement des photos d'événements), ou null. */
export async function eventCategoryId(): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "evenement")
    .maybeSingle();
  return data?.id ?? null;
}

export async function saveGalleryDefs(eventId: string, defs: EventGalleryDef[]): Promise<EventRow> {
  const update: TablesUpdate<"events"> = { galleries: defs };
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", eventId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveGalleryReference(
  eventId: string,
  referenceId: string | null,
): Promise<EventRow> {
  const { data, error } = await supabase
    .from("events")
    .update({ gallery_reference_event_id: referenceId })
    .eq("id", eventId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

const TEMP_ORDER = 1_000_000;

export async function movePlacement(
  items: readonly PlacementLite[],
  id: string,
  delta: -1 | 1,
): Promise<void> {
  const plan = swapPlan(items, id, delta);
  if (!plan) return;
  const set = async (placementId: string, order: number) => {
    const { error } = await supabase
      .from("photo_placements")
      .update({ display_order: order })
      .eq("id", placementId);
    if (error) throw error;
  };
  const originalA = plan.a.display_order;
  await set(plan.a.id, TEMP_ORDER);
  try {
    await set(plan.b.id, originalA);
    await set(plan.a.id, plan.b.display_order);
  } catch (error) {
    await set(plan.a.id, originalA).catch(() => undefined);
    throw error;
  }
}

export async function setPlacementPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase.from("photo_placements").update({ published }).eq("id", id);
  if (error) throw error;
}

export async function setPlacementAlt(id: string, alt: string): Promise<void> {
  const { error } = await supabase
    .from("photo_placements")
    .update({ alt_text_override: alt.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

/** Retire la photo de la galerie. La photo elle-même reste dans l'admin Photos. */
export async function removePlacement(id: string): Promise<void> {
  const { error } = await supabase.from("photo_placements").delete().eq("id", id);
  if (error) throw error;
}

export async function listOtherEvents(
  currentId: string,
): Promise<{ id: string; title: string; status: string }[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, status")
    .neq("id", currentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** true si les tables de photos existent (migration 20260926000003 appliquée). */
export async function galleryTablesAvailable(): Promise<boolean> {
  const { error } = await supabase.from("photo_placements").select("id").limit(1);
  return !error;
}
