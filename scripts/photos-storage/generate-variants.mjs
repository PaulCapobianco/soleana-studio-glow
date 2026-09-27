// Génère localement AVIF + WebP (400 / 800 px et largeur native) de chaque photo du
// manifeste, SANS métadonnées, dans ../soleana-originaux/storage-variants/ (hors dépôt).
// Jamais d'agrandissement : une source de 934 px de large donne 400, 800 et 934 (copie native).
// Même la variante native est réencodée pour retirer les métadonnées.
// Usage : node scripts/photos-storage/generate-variants.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ROOT, VARIANTS_DIR, readManifest, sha256, variantPath } from "./lib.mjs";

const TARGET_WIDTHS = [400, 800];
const FORMATS = ["avif", "webp"];

if (path.relative(ROOT, VARIANTS_DIR).split(path.sep)[0] !== "..") {
  throw new Error("Le dossier de sortie doit être hors du dépôt.");
}

const manifest = await readManifest();
const filesDir = path.join(VARIANTS_DIR, "files");
const index = [];

for (const photo of manifest.photos) {
  const source = path.join(ROOT, photo.source_file);
  const bytes = await readFile(source);
  if (sha256(bytes) !== photo.source_sha256) {
    throw new Error(`Source modifiée depuis la création du manifeste : ${photo.source_file}`);
  }
  const widths = [...new Set([...TARGET_WIDTHS.filter((width) => width < photo.width), photo.width])];

  for (const width of widths) {
    for (const format of FORMATS) {
      // .rotate() applique l'orientation éventuelle ; sharp retire les métadonnées par défaut.
      const pipeline = sharp(bytes).rotate().resize({ width, withoutEnlargement: true });
      const { data, info } = await (format === "avif"
        ? pipeline.avif({ quality: 50, effort: 4 })
        : pipeline.webp({ quality: 80 })
      ).toBuffer({ resolveWithObject: true });
      const hash = sha256(data);
      const storagePath = variantPath(photo.source_key, hash.slice(0, 8), info.width, format);
      const target = path.join(filesDir, storagePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
      index.push({
        source_key: photo.source_key,
        format,
        width: info.width,
        height: info.height,
        byte_size: data.length,
        sha256: hash,
        storage_path: storagePath,
        file: path.relative(VARIANTS_DIR, target),
      });
    }
  }
}

await mkdir(VARIANTS_DIR, { recursive: true });
await writeFile(
  path.join(VARIANTS_DIR, "variants-index.json"),
  `${JSON.stringify({ version: 2, generated_at: new Date().toISOString(), variants: index }, null, 2)}\n`,
);
const total = index.reduce((sum, v) => sum + v.byte_size, 0);
console.log(
  `${index.length} variantes pour ${manifest.photos.length} photos, ${(total / 1e6).toFixed(1)} Mo`,
);
console.log(`Sortie : ${VARIANTS_DIR}`);
