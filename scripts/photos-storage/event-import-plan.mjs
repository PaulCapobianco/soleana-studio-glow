// Logique pure de l'import des photos d'événement (contexte « event ») : validation du manifeste,
// plan, chemins Storage. Aucun accès réseau ni disque : testé dans event-import-plan.test.ts.
import { expectedWidthsFor, FORMATS } from "./quality-profiles.mjs";

export const EVENT_PHOTO_DEFAULTS = Object.freeze({
  published: false,
  category_id: null,
  on_home: false,
  on_portfolio: false,
});

const SLOT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SOURCE_KEY = /^galleries\/evenement\/[a-f0-9]{12}$/;

/** Chemins de variantes acceptés par les politiques Storage : galleries/<cat>/<hex12>/<hex8>-<largeur>.<format>. */
export const eventVariantPath = (sourceKey, hash8, width, format) =>
  `${sourceKey}/${hash8}-${width}.${format}`;

/** Liste des problèmes du manifeste (vide = importable). */
export function validateEventManifest(manifest) {
  const problems = [];
  if (manifest.version !== 1) problems.push("version du manifeste inattendue");
  if (!manifest.event_slug || !SLOT.test(manifest.event_slug)) problems.push("event_slug invalide");
  const galleries = manifest.galleries ?? [];
  const slots = new Set();
  for (const g of galleries) {
    if (!SLOT.test(g.slot ?? "")) problems.push(`slot de galerie invalide : ${g.slot}`);
    if (slots.has(g.slot)) problems.push(`slot en double : ${g.slot}`);
    slots.add(g.slot);
    if (!g.title?.trim() || g.title.length > 80)
      problems.push(`titre de galerie invalide : ${g.slot}`);
  }
  const photoKeys = new Set();
  for (const p of manifest.photos ?? []) {
    if (!SOURCE_KEY.test(p.source_key ?? ""))
      problems.push(`source_key invalide : ${p.source_key}`);
    if (photoKeys.has(p.source_key)) problems.push(`photo en double : ${p.source_key}`);
    photoKeys.add(p.source_key);
    if (!p.alt_text?.trim()) problems.push(`texte alternatif manquant : ${p.source_key}`);
    if (!Number.isSafeInteger(p.width) || p.width < 1)
      problems.push(`largeur invalide : ${p.source_key}`);
    if (!/^[a-f0-9]{64}$/.test(p.source_sha256 ?? ""))
      problems.push(`empreinte invalide : ${p.source_key}`);
  }
  const placementKeys = new Set();
  const orders = {};
  for (const pl of manifest.placements ?? []) {
    if (pl.context_type !== "event") problems.push(`contexte inattendu : ${pl.placement_key}`);
    if (pl.event_slug !== manifest.event_slug)
      problems.push(`événement inattendu : ${pl.placement_key}`);
    if (placementKeys.has(pl.placement_key))
      problems.push(`emplacement en double : ${pl.placement_key}`);
    placementKeys.add(pl.placement_key);
    if (!photoKeys.has(pl.source_key)) problems.push(`photo inconnue : ${pl.placement_key}`);
    if (!slots.has(pl.slot)) problems.push(`galerie inconnue : ${pl.slot}`);
    for (const axis of ["object_position_x_pct", "object_position_y_pct"]) {
      if (!(pl[axis] >= 0 && pl[axis] <= 100))
        problems.push(`cadrage hors 0–100 : ${pl.placement_key}`);
    }
    (orders[pl.slot] ??= []).push(pl.display_order);
  }
  for (const [slot, list] of Object.entries(orders)) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((n, i) => n !== i)) problems.push(`ordre non contigu dans ${slot}`);
  }
  return problems;
}

/** Plan d'import : photos et emplacements retenus (--limit, --only), nombre de variantes attendues. */
export function buildEventImportPlan(manifest, { limit, only } = {}) {
  const problems = validateEventManifest(manifest);
  if (problems.length) throw new Error(`Manifeste invalide :\n- ${problems.join("\n- ")}`);
  let photos = manifest.photos;
  if (only?.length) {
    const wanted = new Set(only);
    photos = photos.filter((p) => wanted.has(p.source_key));
    const missing = only.filter((k) => !photos.some((p) => p.source_key === k));
    if (missing.length) throw new Error(`--only : photo inconnue : ${missing.join(", ")}`);
  }
  if (limit) photos = photos.slice(0, limit);
  const keys = new Set(photos.map((p) => p.source_key));
  const placements = manifest.placements.filter((pl) => keys.has(pl.source_key));
  const variantCount = photos.reduce(
    (n, p) => n + expectedWidthsFor(p.width).length * FORMATS.length,
    0,
  );
  return {
    eventSlug: manifest.event_slug,
    galleries: manifest.galleries,
    photos,
    placements,
    variantCount,
    perGallery: manifest.galleries.map((g) => ({
      slot: g.slot,
      title: g.title,
      count: placements.filter((pl) => pl.slot === g.slot).length,
    })),
  };
}

/** Définitions de galeries à écrire dans events.galleries, en gardant celles qui existent déjà. */
export function mergeGalleryDefs(existing, wanted) {
  const have = Array.isArray(existing) ? existing : [];
  const bySlot = new Map(have.map((g) => [g.slot, g]));
  for (const g of wanted)
    if (!bySlot.has(g.slot)) bySlot.set(g.slot, { slot: g.slot, title: g.title });
  return [...bySlot.values()];
}
