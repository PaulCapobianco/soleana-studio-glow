import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import { MAX_COVER_FILE_BYTES, ACCEPTED_IMAGE_TYPES, resizeToWebp } from "@/lib/admin/image-resize";
import { parseEventRow } from "./parse";
import type { EventContent, EventRow, EventStatus } from "./types";
import { slugify, type EventFormValues } from "./validation";

/** Une ligne de texte = un élément de liste (lignes vides ignorées). */
export const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Ligne de base → valeurs éditables du formulaire. */
export function rowToFormValues(row: EventRow): EventFormValues {
  const event = parseEventRow(row);
  return {
    title: event.title,
    slug: event.slug,
    subtitle: event.subtitle,
    description: event.description,
    location: event.location,
    edition_label: event.edition_label,
    experience_steps: event.experience_steps,
    closing_title: event.closing_title,
    event_dates: [...event.event_dates].sort(),
    fallback_dates: [...event.fallback_dates].sort(),
    availability_note: event.availability_note,
    formules: event.formules.map((f) => ({ ...f, price_eur: f.price_eur })),
    faq: event.faq,
    booking_url: event.booking_url ?? "",
    cover_image_alt: event.cover_image_alt,
    ended_title: event.ended_title,
    ended_text: event.ended_text,
    show_teaser: event.show_teaser,
    teaser_title: event.teaser_title,
    teaser_text: event.teaser_text,
    teaser_cta: event.teaser_cta,
    meta_title: event.meta_title,
    meta_description: event.meta_description,
    og_title: event.og_title,
    og_description: event.og_description,
    theme: event.theme,
    accent_color: event.accent_color ?? "",
    icon_main: event.icon_main,
    icon_bullet: event.icon_bullet,
    display_order: event.display_order,
  };
}

/** Valeurs du formulaire (déjà validées) → colonnes à enregistrer. */
export function formValuesToUpdate(values: EventFormValues): TablesUpdate<"events"> {
  return {
    title: values.title.trim(),
    slug: values.slug,
    subtitle: values.subtitle.trim(),
    description: values.description.trim(),
    location: values.location.trim(),
    edition_label: values.edition_label.trim(),
    experience_steps: values.experience_steps.map((s) => s.trim()).filter(Boolean),
    closing_title: values.closing_title.trim(),
    event_dates: [...values.event_dates].sort(),
    fallback_dates: [...values.fallback_dates].sort(),
    availability_note: values.availability_note.trim(),
    formules: values.formules.map((f) => ({
      name: f.name.trim(),
      price_eur: f.price_eur ?? 0,
      features: f.features.map((s) => s.trim()).filter(Boolean),
      booking_url: f.booking_url.trim(),
      featured: f.featured,
    })),
    faq: values.faq.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })),
    booking_url: values.booking_url.trim() || null,
    cover_image_alt: values.cover_image_alt.trim(),
    ended_title: values.ended_title.trim(),
    ended_text: values.ended_text.trim(),
    show_teaser: values.show_teaser,
    teaser_title: values.teaser_title.trim(),
    teaser_text: values.teaser_text.trim(),
    teaser_cta: values.teaser_cta.trim(),
    meta_title: values.meta_title.trim(),
    meta_description: values.meta_description.trim(),
    og_title: values.og_title.trim(),
    og_description: values.og_description.trim(),
    theme: values.theme,
    accent_color: values.accent_color.trim() ? values.accent_color.trim().toUpperCase() : null,
    icon_main: values.icon_main,
    icon_bullet: values.icon_bullet,
    display_order: values.display_order,
  };
}

/** Contenu tel que la page publique l'afficherait, pour l'aperçu avant publication. */
export function previewContent(row: EventRow, values: EventFormValues): EventContent {
  const update = formValuesToUpdate(values);
  return parseEventRow({
    ...row,
    ...(update as Partial<EventRow>),
    formules: update.formules ?? [],
    faq: update.faq ?? [],
  } as EventRow);
}

// ---- Écritures -----------------------------------------------------------------------------

// Messages écrits en français par les règles de la base (slug figé, adresse réservée…) : ils sont
// déjà destinés à l'utilisatrice. Les autres erreurs restent traitées par friendlySupabaseError.
function asAdminError(error: { code?: string; message?: string }): unknown {
  if (error.code === "23505") {
    return new AdminValidationError(
      "Cette adresse de page est déjà utilisée par un autre événement.",
    );
  }
  if (error.code === "P0001" && error.message) return new AdminValidationError(error.message);
  return error;
}

export async function listEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Premier slug libre à partir de `base` (base, base-2, base-3…). */
async function freeSlug(base: string): Promise<string> {
  const root = slugify(base) || "evenement";
  const { data, error } = await supabase.from("events").select("slug").like("slug", `${root}%`);
  if (error) throw error;
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 100; n += 1) {
    if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  }
  throw new AdminValidationError("Impossible de trouver une adresse libre : changez le titre.");
}

export async function createEvent(title: string): Promise<EventRow> {
  const clean = title.trim();
  if (!clean) throw new AdminValidationError("Donnez un titre à l'événement.");
  const insert: TablesInsert<"events"> = {
    title: clean,
    slug: await freeSlug(clean),
    status: "draft",
    display_order: 0,
  };
  const { data, error } = await supabase.from("events").insert(insert).select("*").single();
  if (error) throw asAdminError(error);
  return data;
}

/**
 * Copie un événement pour une nouvelle édition : textes, formules, FAQ et image de couverture
 * sont repris ; les dates sont vidées (à choisir) et le teaser désactivé. La copie est un brouillon.
 */
export async function duplicateEvent(row: EventRow): Promise<EventRow> {
  const insert: TablesInsert<"events"> = {
    slug: await freeSlug(`${row.slug}-copie`),
    title: `${row.title} (copie)`,
    subtitle: row.subtitle,
    description: row.description,
    location: row.location,
    edition_label: row.edition_label,
    experience_steps: row.experience_steps,
    closing_title: row.closing_title,
    event_dates: [],
    fallback_dates: [],
    availability_note: row.availability_note,
    formules: row.formules,
    faq: row.faq,
    booking_url: row.booking_url,
    cover_image_url: row.cover_image_url,
    cover_image_small_url: row.cover_image_small_url,
    cover_image_alt: row.cover_image_alt,
    ended_title: row.ended_title,
    ended_text: row.ended_text,
    show_teaser: false,
    teaser_title: row.teaser_title,
    teaser_text: row.teaser_text,
    teaser_cta: row.teaser_cta,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    og_title: row.og_title,
    og_description: row.og_description,
    theme: row.theme,
    accent_color: row.accent_color,
    icon_main: row.icon_main,
    icon_bullet: row.icon_bullet,
    status: "draft",
    display_order: row.display_order,
  };
  const { data, error } = await supabase.from("events").insert(insert).select("*").single();
  if (error) throw asAdminError(error);
  return data;
}

export async function saveEvent(
  id: string,
  update: TablesUpdate<"events">,
  status?: EventStatus,
): Promise<EventRow> {
  const { data, error } = await supabase
    .from("events")
    .update(status ? { ...update, status } : update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw asAdminError(error);
  return data;
}

/** Suppression réservée aux brouillons jamais publiés (sinon : archiver). */
export async function deleteDraftEvent(row: EventRow): Promise<void> {
  if (row.status !== "draft" || row.first_published_at) {
    throw new AdminValidationError(
      "Seul un brouillon jamais publié peut être supprimé. Archivez cet événement à la place.",
    );
  }
  const { error } = await supabase.from("events").delete().eq("id", row.id);
  if (error) throw error;
  await removeCoverFiles(row).catch(() => undefined);
}

// ---- Image de couverture -------------------------------------------------------------------

const BUCKET = "photos";
const COVER_WIDTHS = [800, 1600] as const;

function pathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

// Une copie (duplication) partage l'image de l'original : on ne supprime jamais que les fichiers
// rangés sous le dossier de cet événement, pas ceux d'un autre.
function ownCoverPaths(
  row: Pick<EventRow, "id" | "cover_image_url" | "cover_image_small_url">,
): string[] {
  const prefix = `events/${row.id}/`;
  return [row.cover_image_url, row.cover_image_small_url]
    .map(pathFromPublicUrl)
    .filter((p): p is string => p !== null && p.startsWith(prefix));
}

async function removeCoverFiles(
  row: Pick<EventRow, "id" | "cover_image_url" | "cover_image_small_url">,
) {
  const paths = ownCoverPaths(row);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

export function checkCoverFile(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new AdminValidationError("Choisissez une photo au format JPG, PNG ou WebP.");
  }
  if (file.size > MAX_COVER_FILE_BYTES) {
    throw new AdminValidationError("Cette photo est trop lourde (25 Mo maximum).");
  }
}

/** Envoie la couverture (800 et 1600 px, WebP) puis l'enregistre sur l'événement. */
export async function uploadCover(row: EventRow, file: File): Promise<EventRow> {
  checkCoverFile(file);
  let resized;
  try {
    resized = await resizeToWebp(file, COVER_WIDTHS);
  } catch {
    throw new AdminValidationError(
      "Cette photo n'a pas pu être préparée. Essayez avec une autre photo (JPG de préférence).",
    );
  }

  const stamp = Date.now();
  const uploaded: string[] = [];
  const urls: string[] = [];
  try {
    for (const [index, image] of resized.entries()) {
      const path = `events/${row.id}/cover-${COVER_WIDTHS[index]}-${stamp}.webp`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, image.blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      uploaded.push(path);
      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    const saved = await saveEvent(row.id, {
      cover_image_small_url: urls[0],
      cover_image_url: urls[1],
    });
    await removeCoverFiles(row).catch(() => undefined);
    return saved;
  } catch (error) {
    if (uploaded.length)
      await supabase.storage
        .from(BUCKET)
        .remove(uploaded)
        .catch(() => undefined);
    throw error;
  }
}

export async function removeCover(row: EventRow): Promise<EventRow> {
  const saved = await saveEvent(row.id, { cover_image_url: null, cover_image_small_url: null });
  await removeCoverFiles(row).catch(() => undefined);
  return saved;
}
