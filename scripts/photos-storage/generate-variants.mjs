// Génère localement les variantes webp (400 / 800 px et la largeur native) de chaque photo du
// manifeste, SANS métadonnées, dans ../soleana-originaux/storage-variants/ (hors dépôt).
// Jamais d'agrandissement : une source de 934 px de large donne 400, 800 et 934 (copie native).
// La variante native est la copie octet pour octet du fichier source (déjà sans métadonnées).
// Usage : node scripts/photos-storage/generate-variants.mjs
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ROOT, VARIANTS_DIR, readManifest, sha256, variantPath } from "./lib.mjs";

const TARGET_WIDTHS = [400, 800];
const QUALITY = 80;

if (path.relative(ROOT, VARIANTS_DIR).split(path.sep)[0] !== "..") {
  throw new Error("Le dossier de sortie doit être hors du dépôt.");
}

const manifest = await readManifest();
const filesDir = path.join(VARIANTS_DIR, "files");
const index = [];

for (const photo of manifest.photos) {
  const source = path.join(ROOT, photo.source_file);
  const bytes = await readFile(source);
  const outputs = [];

  for (const width of TARGET_WIDTHS) {
    if (width >= photo.width) continue;
    // .rotate() applique l'orientation éventuelle ; sharp retire les métadonnées par défaut.
    const { data, info } = await sharp(bytes)
      .rotate()
      .resize({ width })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });
    outputs.push({ width: info.width, height: info.height, data });
  }
  outputs.push({ width: photo.width, height: photo.height, data: bytes });

  for (const out of outputs) {
    const hash = sha256(out.data);
    const storagePath = variantPath(photo.source_key, hash.slice(0, 8), out.width);
    const target = path.join(filesDir, storagePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, out.data);
    index.push({
      source_key: photo.source_key,
      width: out.width,
      height: out.height,
      byte_size: out.data.length,
      sha256: hash,
      storage_path: storagePath,
      file: path.relative(VARIANTS_DIR, target),
    });
  }
}

await mkdir(VARIANTS_DIR, { recursive: true });
await writeFile(
  path.join(VARIANTS_DIR, "variants-index.json"),
  `${JSON.stringify({ version: 1, generated_at: new Date().toISOString(), variants: index }, null, 2)}\n`,
);
const total = index.reduce((sum, v) => sum + v.byte_size, 0);
console.log(
  `${index.length} variantes pour ${manifest.photos.length} photos, ${(total / 1e6).toFixed(1)} Mo`,
);
console.log(`Sortie : ${VARIANTS_DIR}`);
await stat(path.join(VARIANTS_DIR, "variants-index.json"));
