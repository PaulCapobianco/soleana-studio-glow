import { z } from "zod";
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

  return { ...row, status, formules, faq };
}
