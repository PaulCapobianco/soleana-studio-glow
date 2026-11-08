import { isEditionOver, nextEventDate } from "./dates";
import type { EventContent } from "./types";

/**
 * Événement à montrer dans le teaser de l'accueil : parmi les événements publiés dont le teaser est
 * activé et dont l'édition n'est pas terminée, celui dont la prochaine date (report compris) est la
 * plus proche. `display_order` ne départage que deux événements ayant la même prochaine date
 * (puis la création la plus récente, puis l'adresse, pour un résultat toujours stable).
 */
export function pickTeaserEvent(events: readonly EventContent[], now: Date): EventContent | null {
  const candidates = events
    .filter((e) => e.status === "published" && e.show_teaser)
    .filter((e) => !isEditionOver(e.event_dates, e.fallback_dates, now))
    .map((event) => ({ event, next: nextEventDate(event.event_dates, event.fallback_dates, now) }))
    .filter((c): c is { event: EventContent; next: string } => c.next !== null);

  candidates.sort(
    (a, b) =>
      a.next.localeCompare(b.next) ||
      a.event.display_order - b.event.display_order ||
      b.event.created_at.localeCompare(a.event.created_at) ||
      a.event.slug.localeCompare(b.event.slug),
  );
  return candidates[0]?.event ?? null;
}
