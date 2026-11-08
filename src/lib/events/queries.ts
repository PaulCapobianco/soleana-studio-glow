import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isEditionOver } from "./dates";
import { parseEventRow } from "./parse";
import { buildTeaser } from "./presentation";
import { pickTeaserEvent } from "./teaser-selection";
import { LEGACY_NOEL_SLUG, legacyNoelEvent } from "./legacy-noel";
import type { EventContent, EventTeaserData, PublicEventPage } from "./types";

// Les chargeurs de route s'exécutent aussi dans le navigateur lors d'une navigation : l'horloge
// (« édition terminée ») est donc lue ici, côté serveur, comme le faisait getNoel2026EditionState.
//
// Repli transitoire : tant que la table `events` n'existe pas (migration pas encore appliquée) ou
// ne répond pas, la page Noël 2026 est servie depuis les données du code, exactement comme avant.
// Une table qui répond sans ligne publiée, elle, signifie bien « rien à afficher ».
// À retirer (avec legacy-noel.ts) une fois la migration appliquée et vérifiée.

// PostgREST (PGRST205) / Postgres (42P01) : la table n'existe pas encore.
function isMissingTable(error: { code?: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01";
}

export const getPublishedEvent = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }): Promise<PublicEventPage | null> => {
    const { data: row, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error(`[events] Échec du chargement de "${data.slug}":`, error);
      if (data.slug === LEGACY_NOEL_SLUG) return await legacyPage();
      // Table pas encore créée : aucun événement, donc une vraie 404 (pas une 500).
      if (isMissingTable(error)) return null;
      throw new Error("Erreur de chargement de la page");
    }
    if (!row) return null;

    const event = parseEventRow(row);
    return await pageFor(event);
  });

// Import dynamique, à l'intérieur des fonctions serveur seulement : les tracés d'icônes et les
// thèmes restent hors du JavaScript envoyé aux visiteurs (le navigateur ne reçoit que les deux
// icônes choisies et trois couleurs).
async function appearanceFor(event: EventContent) {
  const { buildAppearance } = await import("./appearance");
  return buildAppearance(event);
}

// Même interrupteur que photo-storage.ts, relu ici pour ne pas importer ce module côté navigateur.
const GALLERIES_FROM_STORAGE = import.meta.env.VITE_GALLERIES_FROM_STORAGE === "true";

async function pageFor(event: EventContent): Promise<PublicEventPage> {
  return {
    event,
    isOver: isEditionOver(event.event_dates, event.fallback_dates, new Date()),
    appearance: await appearanceFor(event),
    // Désactivé : aucune requête supplémentaire, rien de plus dans la page.
    galleryGroups: GALLERIES_FROM_STORAGE
      ? await (await import("./gallery-loader")).loadGalleryGroups(event)
      : [],
  };
}

function legacyPage(): Promise<PublicEventPage> {
  return pageFor(legacyNoelEvent());
}

/**
 * Teaser d'accueil : l'événement publié (teaser activé, édition non terminée) dont la prochaine date
 * est la plus proche ; voir pickTeaserEvent. Un seul teaser à la fois.
 */
export const getHomeTeaser = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventTeaserData | null> => {
    const { data: rows, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("show_teaser", true);

    if (error) {
      console.error("[events] Échec du chargement du teaser d'accueil:", error);
      const legacy = legacyNoelEvent();
      return isEditionOver(legacy.event_dates, legacy.fallback_dates, new Date())
        ? null
        : buildTeaser(legacy, await appearanceFor(legacy));
    }

    const chosen = pickTeaserEvent((rows ?? []).map(parseEventRow), new Date());
    return chosen ? buildTeaser(chosen, await appearanceFor(chosen)) : null;
  },
);

/** Pour le sitemap : adresses et dates de modification des événements publiés. */
export async function listPublishedEventUrls(): Promise<
  { slug: string; updatedAt: string }[] | null
> {
  const { data, error } = await supabase
    .from("events")
    .select("slug, updated_at")
    .eq("status", "published");
  if (error) {
    console.error("[events] Échec du chargement du sitemap:", error);
    return null;
  }
  return (data ?? []).map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
