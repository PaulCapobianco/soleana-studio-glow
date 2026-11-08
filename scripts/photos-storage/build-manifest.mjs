// Construit docs/photos-storage/manifest-phase1.json : chaque photo (dédupliquée par contenu) et
// chaque emplacement dans les galeries des pages SEO, avec ordre, texte alternatif et cadrage
// actuels. Lecture seule sur les assets ; écrit uniquement le manifeste.
// Usage : node scripts/photos-storage/build-manifest.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GALLERIES, MANIFEST_PATH, ROOT, listGalleryFiles, pad, sha256 } from "./lib.mjs";
import { TARGET_WIDTHS } from "./quality-profiles.mjs";

let previousManifest;
try {
  previousManifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const previousByKey = new Map((previousManifest?.photos ?? []).map((photo) => [photo.source_key, photo]));
const photos = new Map(); // sha256 -> photo
const placements = [];

for (const gallery of GALLERIES) {
  const files = await listGalleryFiles(gallery);
  for (const [index, file] of files.entries()) {
    const bytes = await readFile(path.join(ROOT, file.rel));
    const hash = sha256(bytes);
    let photo = photos.get(hash);
    if (!photo) {
      const meta = await sharp(bytes).metadata();
      photo = {
        source_key: `galleries/${gallery.category}/${hash.slice(0, 12)}`,
        category: gallery.category,
        source_sha256: hash,
        width: meta.width,
        height: meta.height,
        alt_text: gallery.prefix,
      };
      const previous = previousByKey.get(photo.source_key);
      // Preserve the privately verified source dimensions/fingerprint when the local gallery
      // asset is unchanged; never replace them with the smaller local WebP dimensions.
      if (previous?.source_sha256 === hash && previous.source_kind === "original" &&
          Number.isSafeInteger(previous.width) && Number.isSafeInteger(previous.height) &&
          /^[0-9a-f]{64}$/.test(previous.original_sha256 ?? "")) {
        photo.width = previous.width;
        photo.height = previous.height;
        photo.source_kind = previous.source_kind;
        photo.original_sha256 = previous.original_sha256;
      }
      photos.set(hash, photo);
    }
    placements.push({
      placement_key: `seo/${gallery.seo}/${gallery.slot}/${pad(index + 1)}`,
      seo_slug: gallery.seo,
      slot: gallery.slot,
      display_order: index,
      source_key: photo.source_key,
      // Texte alternatif actuellement affiché par le site (à améliorer plus tard dans l'admin).
      alt: `${gallery.prefix} - photo ${index + 1}`,
      object_position_x_pct: 50,
      object_position_y_pct: 50,
    });
  }
}

const manifest = {
  version: 3,
  phase: "galleries-seo",
  note: "Généré par build-manifest.mjs puis match-originals.mjs — ne pas éditer à la main.",
  variant_formats: ["avif", "webp"],
  target_widths: TARGET_WIDTHS,
  galleries: GALLERIES.map(({ seo, category, slot, dirs }) => ({
    seo,
    category,
    slot,
    dirs,
    count: placements.filter((p) => p.seo_slug === seo && p.slot === slot).length,
  })),
  photos: [...photos.values()],
  placements,
};

await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.photos.length} photos, ${manifest.placements.length} emplacements`);
for (const g of manifest.galleries) console.log(`  ${g.seo} ${g.slot}: ${g.count}`);
