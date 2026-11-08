// Génère localement AVIF + WebP (400 / 800 / 1200 / 1600 px, sans agrandissement) de chaque photo du
// manifeste, SANS métadonnées, dans ../soleana-originaux/storage-variants/ (hors dépôt).
// Les variantes sont toujours dérivées de la source originale, jamais d'une autre variante.
// Usage : node scripts/photos-storage/generate-variants.mjs --profile q55
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MANIFEST_PATH, ROOT, VARIANTS_DIR, readManifest, sha256, variantPath } from "./lib.mjs";
import { FORMATS, GENERATION_VERSION, TARGET_WIDTHS, expectedWidthsFor, getQualityProfile } from "./quality-profiles.mjs";

const profileIndex = process.argv.indexOf("--profile");
const profileName = profileIndex >= 0 ? process.argv[profileIndex + 1] : undefined;
if (!profileName || process.argv.slice(profileIndex + 2).includes("--profile")) {
  throw new Error("Choisir le profil définitif : --profile q55.");
}
const quality = getQualityProfile(profileName);
const ENCODER_SETTINGS = {
  quality_profile: quality.name,
  sharp: sharp.versions.sharp,
  libvips: sharp.versions.vips,
  aom: sharp.versions.aom,
  webpEncoder: sharp.versions.webp,
  avif: quality.avif,
  webp: quality.webp,
};

if (path.relative(ROOT, VARIANTS_DIR).split(path.sep)[0] !== "..") {
  throw new Error("Le dossier de sortie doit être hors du dépôt.");
}

const manifest = await readManifest();
const mapping = JSON.parse(await readFile(path.join(VARIANTS_DIR, "original-matches.json"), "utf8"));
if (manifest.version !== 3 || mapping.version !== 1 || mapping.matches.length !== manifest.photos.length) {
  throw new Error("Correspondances des originaux absentes : exécuter match-originals.mjs.");
}
const matchesByKey = new Map(mapping.matches.map((match) => [match.source_key, match]));
const filesDir = path.join(VARIANTS_DIR, "files");
const indexPath = path.join(VARIANTS_DIR, "variants-index.json");
const progressPath = path.join(VARIANTS_DIR, "variants-index.progress.json");
const inputHash = sha256(Buffer.from(JSON.stringify({
  manifest: sha256(await readFile(MANIFEST_PATH)),
  matches: sha256(await readFile(path.join(VARIANTS_DIR, "original-matches.json"))),
  encoder: ENCODER_SETTINGS,
})));
const perPhoto = new Array(manifest.photos.length);
let nextPhoto = 0;
let completed = 0;
let reused = 0;
let progressWrite = Promise.resolve();

async function readIndex(file) {
  try {
    const index = JSON.parse(await readFile(file, "utf8"));
    return index.version === GENERATION_VERSION && index.input_hash === inputHash ? index : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const previous = await readIndex(progressPath) ?? await readIndex(indexPath);
const previousByKey = new Map();
for (const variant of previous?.variants ?? []) {
  const key = `${variant.source_key}/${variant.width}/${variant.format}`;
  if (previousByKey.has(key)) throw new Error(`Doublon dans l'index de reprise : ${key}`);
  previousByKey.set(key, variant);
}

async function reusable(variant, photo, match, width, format) {
  if (!variant || variant.source_sha256 !== match.selected_sha256 ||
      variant.source_key !== photo.source_key || variant.width !== width || variant.format !== format ||
      Math.abs(variant.height - Math.round(photo.height * width / photo.width)) > 1 ||
      variant.file !== `files/${variant.storage_path}` ||
      variant.storage_path !== variantPath(photo.source_key, variant.sha256?.slice(0, 8), width, format)) return false;
  try {
    const bytes = await readFile(path.join(VARIANTS_DIR, variant.file));
    if (bytes.length !== variant.byte_size || sha256(bytes) !== variant.sha256) return false;
    const meta = await sharp(bytes).metadata();
    if (meta.format !== (format === "avif" ? "heif" : "webp") || meta.width !== width ||
        meta.height !== variant.height || meta.exif || meta.icc || meta.xmp || meta.iptc || meta.orientation) return false;
    if (format === "avif" && (bytes.toString("latin1", 4, 8) !== "ftyp" ||
        !["avif", "avis"].includes(bytes.toString("latin1", 8, 12)))) return false;
    if (format === "webp" && (bytes.toString("latin1", 0, 4) !== "RIFF" ||
        bytes.toString("latin1", 8, 12) !== "WEBP")) return false;
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof Error) return false;
    throw error;
  }
}

async function saveProgress() {
  progressWrite = progressWrite.then(async () => {
    const variants = perPhoto.flatMap((items) => items ?? []);
    const temporary = `${progressPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ version: GENERATION_VERSION, input_hash: inputHash, target_widths: TARGET_WIDTHS, encoder_settings: ENCODER_SETTINGS, variants }, null, 2)}\n`);
    await rename(temporary, progressPath);
  });
  await progressWrite;
}

async function generatePhoto(photo, photoIndex) {
  const match = matchesByKey.get(photo.source_key);
  if (!match || match.source_sha256 !== photo.source_sha256 ||
      match.selected_sha256 !== (photo.original_sha256 ?? photo.source_sha256)) {
    throw new Error(`Correspondance obsolète : ${photo.source_key}`);
  }
  const source = path.resolve(path.dirname(ROOT), match.selected_file);
  const expectedRoot = photo.source_kind === "original"
    ? path.resolve(ROOT, "../soleana-originaux/galeries")
    : path.join(ROOT, "src/assets");
  if (!source.startsWith(`${expectedRoot}${path.sep}`)) throw new Error("Source hors du dossier autorisé.");
  const bytes = await readFile(source);
  if (sha256(bytes) !== match.selected_sha256) {
    throw new Error(`Source modifiée depuis la comparaison : ${photo.source_key}`);
  }
  const widths = expectedWidthsFor(photo.width);
  const own = [];

  for (const width of widths) {
    for (const format of FORMATS) {
      const old = previousByKey.get(`${photo.source_key}/${width}/${format}`);
      if (await reusable(old, photo, match, width, format)) {
        own.push(old);
        reused += 1;
        continue;
      }
      // .rotate() applique l'orientation éventuelle ; sharp retire les métadonnées par défaut.
      const pipeline = sharp(bytes).rotate().resize({ width, withoutEnlargement: true });
      const { data, info } = await (format === "avif"
        ? pipeline.avif(ENCODER_SETTINGS.avif)
        : pipeline.webp(ENCODER_SETTINGS.webp)
      ).toBuffer({ resolveWithObject: true });
      const hash = sha256(data);
      const storagePath = variantPath(photo.source_key, hash.slice(0, 8), info.width, format);
      const target = path.join(filesDir, storagePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
      own.push({
        source_key: photo.source_key,
        source_sha256: match.selected_sha256,
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
  perPhoto[photoIndex] = own;
  await saveProgress();
  completed += 1;
  if (completed % 20 === 0 || completed === manifest.photos.length) {
    console.log(`${completed}/${manifest.photos.length} photos réencodées`);
  }
}

async function worker() {
  while (nextPhoto < manifest.photos.length) {
    const photoIndex = nextPhoto++;
    await generatePhoto(manifest.photos[photoIndex], photoIndex);
  }
}

await Promise.all(Array.from({ length: Math.min(6, manifest.photos.length) }, worker));
const index = perPhoto.flat();
for (const [photoIndex, photo] of manifest.photos.entries()) {
  const match = matchesByKey.get(photo.source_key);
  const expectedWidths = expectedWidthsFor(photo.width);
  if (perPhoto[photoIndex]?.length !== expectedWidths.length * FORMATS.length) {
    throw new Error(`Variantes incomplètes : ${photo.source_key}`);
  }
  for (const variant of perPhoto[photoIndex]) {
    if (!await reusable(variant, photo, match, variant.width, variant.format)) {
      throw new Error(`Variante invalide après génération : ${variant.storage_path}`);
    }
  }
}
await mkdir(VARIANTS_DIR, { recursive: true });
await writeFile(
  `${indexPath}.tmp`,
  `${JSON.stringify({ version: GENERATION_VERSION, input_hash: inputHash, target_widths: TARGET_WIDTHS, encoder_settings: ENCODER_SETTINGS, generated_at: new Date().toISOString(), variants: index }, null, 2)}\n`,
);
await rename(`${indexPath}.tmp`, indexPath);
await rm(progressPath, { force: true });

// Les anciennes variantes ne sont jamais référencées par l'index final ni importées.
const indexedFiles = new Set(index.map((variant) => path.join(VARIANTS_DIR, variant.file)));
let obsolete = 0;
async function prune(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await prune(file);
    else if (entry.isFile() && /\.(avif|webp)$/.test(entry.name) && !indexedFiles.has(file)) {
      await rm(file);
      obsolete += 1;
    }
  }
}
await prune(filesDir);
const total = index.reduce((sum, v) => sum + v.byte_size, 0);
console.log(
  `${index.length} variantes pour ${manifest.photos.length} photos, ${(total / 1e6).toFixed(1)} Mo (${reused} reprises, ${obsolete} anciennes supprimées)`,
);
console.log(`Sortie : ${VARIANTS_DIR}`);
