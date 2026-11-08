import { z } from "zod";
import { parseGalleryDefs } from "./galleries";
import { DEFAULT_BULLET_ICON, DEFAULT_MAIN_ICON, isBulletIcon, isMainIcon } from "./icons";
import { DEFAULT_THEME_ID, isHexColor, isThemeId } from "./theme";
import type { EventContent, EventFaqItem, EventFormule, EventRow, EventStatus } from "./types";

const formuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price_eur: z.number().int().min(0).max(100000),
  features: z.array(z.string()).default([]),
  booking_url: z.string().trim().default(""),
  featured: z.boolean().default(false),
});

const faqItemSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

const STATUSES: readonly EventStatus[] = ["draft", "published", "archived"];

/**
 * Valide les colonnes JSON d'une ligne `events`. Une entrée mal formée est écartée (et signalée
 * dans les logs) plutôt que de faire tomber toute la page.
 */
export function parseEventRow(row: EventRow): EventContent {
  const formules: EventFormule[] = [];
  for (const item of Array.isArray(row.formules) ? row.formules : []) {
    const parsed = formuleSchema.safeParse(item);
    if (parsed.success) formules.push(parsed.data);
    else console.error(`[events] Formule ignorée (${row.slug}):`, parsed.error.issues[0]?.message);
  }

  const faq: EventFaqItem[] = [];
  for (const item of Array.isArray(row.faq) ? row.faq : []) {
    const parsed = faqItemSchema.safeParse(item);
    if (parsed.success) faq.push(parsed.data);
    else console.error(`[events] Question ignorée (${row.slug}):`, parsed.error.issues[0]?.message);
  }

  const status = STATUSES.includes(row.status as EventStatus)
    ? (row.status as EventStatus)
    : "draft";

  // Valeurs inconnues ou absentes (ligne lue avant l'application de la migration d'apparence) :
  // on retombe sur l'apparence d'origine plutôt que de faire échouer la page.
  const theme = isThemeId(String(row.theme)) ? row.theme : DEFAULT_THEME_ID;
  const accent_color = row.accent_color && isHexColor(row.accent_color) ? row.accent_color : null;
  const icon_main = isMainIcon(String(row.icon_main)) ? row.icon_main : DEFAULT_MAIN_ICON;
  const icon_bullet = isBulletIcon(String(row.icon_bullet)) ? row.icon_bullet : DEFAULT_BULLET_ICON;

  // Colonnes ajoutées par 20261110000000 : absentes tant qu'elle n'est pas appliquée.
  const galleries = parseGalleryDefs((row as { galleries?: unknown }).galleries);
  const gallery_reference_event_id =
    (row as { gallery_reference_event_id?: string | null }).gallery_reference_event_id ?? null;

  return {
    ...row,
    status,
    formules,
    faq,
    theme,
    accent_color,
    icon_main,
    icon_bullet,
    galleries,
    gallery_reference_event_id,
  };
}
