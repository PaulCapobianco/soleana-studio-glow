import { expectedWidthsFor, FORMATS, TARGET_WIDTHS } from "./quality-profiles.mjs";

export const IMPORT_PHOTO_DEFAULTS = Object.freeze({
  category_id: null,
  published: false,
  on_home: false,
  on_portfolio: false,
});

export function isLegacyGalleryVisible(photo) {
  return Boolean(photo.published && (photo.category_id || photo.on_home || photo.on_portfolio));
}

export function selectImportPhotos(manifest, { limit, only } = {}) {
  let selected = manifest.photos;
  if (only?.length) {
    const keys = new Set(only);
    selected = selected.filter((photo) => keys.has(photo.source_key));
    if (selected.length !== keys.size) throw new Error("Une ou plusieurs source_key demandées sont absentes du manifeste.");
  }
  if (limit) selected = selected.slice(0, limit);
  return selected;
}

export function buildImportPlan(manifest, options = {}) {
  const targetWidths = manifest.target_widths ?? TARGET_WIDTHS;
  const formats = manifest.variant_formats ?? FORMATS;
  if (targetWidths.join(",") !== TARGET_WIDTHS.join(",") || formats.join(",") !== FORMATS.join(",")) {
    throw new Error("Le manifeste doit prévoir AVIF/WebP en 400/800/1200/1600 px.");
  }
  const selected = selectImportPhotos(manifest, options);
  const sourceKeys = new Set(selected.map((photo) => photo.source_key));
  const placements = manifest.placements.filter((placement) => sourceKeys.has(placement.source_key));
  const variantCountsByWidth = Object.fromEntries(targetWidths.map((width) => [width, 0]));
  let variantCount = 0;
  for (const photo of selected) {
    for (const width of expectedWidthsFor(photo.width, targetWidths)) {
      variantCount += formats.length;
      if (variantCountsByWidth[width] !== undefined) variantCountsByWidth[width] += formats.length;
    }
  }
  return {
    selected,
    placements,
    photoCount: selected.length,
    placementCount: placements.length,
    variantCount,
    variantCountsByWidth,
    formats,
    targetWidths,
  };
}
