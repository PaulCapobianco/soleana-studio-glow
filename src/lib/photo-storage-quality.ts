export const PHOTO_VARIANT_WIDTHS = [400, 800, 1200, 1600] as const;

export type PhotoQualityProfileName = "q55";

export const PHOTO_QUALITY_PROFILES = {
  q55: {
    avif: {
      quality: 55,
      qualityAlpha: -1,
      speed: 4,
      subsample: 3,
      bitDepth: 8,
      lossless: false,
    },
    webp: {
      quality: 80,
      method: 4,
      alpha_quality: 100,
      use_sharp_yuv: 1,
      lossless: 0,
      near_lossless: 100,
    },
  },
} as const;

// The photographer approved q55 as the final browser encoding profile.
export const ACTIVE_PHOTO_QUALITY_PROFILE: PhotoQualityProfileName = "q55";

export function expectedPhotoWidths(sourceWidth: number): number[] {
  if (!Number.isSafeInteger(sourceWidth) || sourceWidth < 1) {
    throw new Error(`Largeur source invalide : ${sourceWidth}`);
  }
  return [...new Set(PHOTO_VARIANT_WIDTHS.map((width) => Math.min(width, sourceWidth)))];
}
