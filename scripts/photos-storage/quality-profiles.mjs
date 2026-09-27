export const GENERATION_VERSION = 4;
export const TARGET_WIDTHS = Object.freeze([400, 800, 1200, 1600]);
export const FORMATS = Object.freeze(["avif", "webp"]);

export const QUALITY_PROFILES = Object.freeze({
  q55: Object.freeze({
    name: "q55",
    avif: Object.freeze({
      quality: 55,
      effort: 4,
      lossless: false,
      chromaSubsampling: "4:4:4",
      bitdepth: 8,
    }),
    webp: Object.freeze({
      quality: 80,
      effort: 4,
      alphaQuality: 100,
      lossless: false,
      nearLossless: false,
      smartSubsample: true,
    }),
  }),
});

export function getQualityProfile(name) {
  const profile = QUALITY_PROFILES[name];
  if (!profile) throw new Error(`Profil qualité invalide : ${name ?? "(absent)"}. Le profil définitif est q55.`);
  return profile;
}

export function expectedWidthsFor(sourceWidth, targetWidths = TARGET_WIDTHS) {
  if (!Number.isSafeInteger(sourceWidth) || sourceWidth < 1) {
    throw new Error(`Largeur source invalide : ${sourceWidth}`);
  }
  return [...new Set(targetWidths.map((width) => Math.min(width, sourceWidth)))];
}

export function expectedVariantCount(photos, targetWidths = TARGET_WIDTHS, formats = FORMATS) {
  return photos.reduce((total, photo) =>
    total + expectedWidthsFor(photo.width, targetWidths).length * formats.length, 0);
}
