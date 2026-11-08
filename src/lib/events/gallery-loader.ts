import { supabase } from "@/integrations/supabase/client";
import { loadEventGalleries } from "@/lib/photo-storage";
import { buildGalleryGroups, publicGalleries, type EventGalleryGroup } from "./galleries";
import { parseEventRow } from "./parse";
import type { EventContent } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Galeries d'un événement lues depuis Storage : les siennes, puis celles de l'événement référencé
 * (« Édition précédente ») s'il est publié. Serveur seulement (import dynamique depuis queries.ts).
 * Ne lève jamais : en cas d'erreur ou de tables absentes, retourne [] et la page garde son affichage.
 */
export async function loadGalleryGroups(event: EventContent): Promise<EventGalleryGroup[]> {
  try {
    const own = UUID.test(event.id)
      ? publicGalleries(event.galleries, await loadEventGalleries(event.id))
      : [];

    let previous: Parameters<typeof buildGalleryGroups>[0]["previous"] = null;
    if (event.gallery_reference_event_id) {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", event.gallery_reference_event_id)
        .eq("status", "published")
        .maybeSingle();
      if (data) {
        const referenced = parseEventRow(data);
        previous = {
          title: referenced.title,
          slug: referenced.slug,
          galleries: publicGalleries(referenced.galleries, await loadEventGalleries(referenced.id)),
        };
      }
    }
    return buildGalleryGroups({ own, previous });
  } catch (error) {
    console.error("[events] Galeries illisibles, affichage sans galerie Storage.", error);
    return [];
  }
}
