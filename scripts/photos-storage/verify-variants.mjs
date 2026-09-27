// Vérifie dimensions, poids, empreintes, formats et absence de métadonnées des variantes locales.
// Usage : node scripts/photos-storage/verify-variants.mjs
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { VARIANTS_DIR, readManifest, sha256 } from "./lib.mjs";

const manifest = await readManifest();
const index = JSON.parse(await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"));
const variants = index.variants;
if (manifest.version !== 3 || index.version !== 3) throw new Error("Manifeste ou index obsolète.");
const problems = [];
const summary = new Map();
const seen = new Set();
const photosByKey = new Map(manifest.photos.map((photo) => [photo.source_key, photo]));
let total = 0;

function webpChunks(buffer) {
  const found = [];
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    found.push(buffer.toString("latin1", pos, pos + 4));
    const length = buffer.readUInt32LE(pos + 4);
    pos += 8 + length + (length & 1);
  }
  return found;
}

for (const v of variants) {
  const photo = photosByKey.get(v.source_key);
  if (!photo || v.source_sha256 !== (photo.original_sha256 ?? photo.source_sha256) ||
      Math.abs(v.height - Math.round(photo.height * v.width / photo.width)) > 1) {
    problems.push(`${v.source_key}: source ou proportions incohérentes`);
  }
  if (v.file !== `files/${v.storage_path}` ||
      v.storage_path !== `${v.source_key}/${v.sha256?.slice(0, 8)}-${v.width}.${v.format}`) {
    problems.push(`${v.source_key}: chemin ou empreinte de clé incohérent`);
  }
  const bytes = await readFile(path.join(VARIANTS_DIR, v.file));
  const key = `${v.source_key}/${v.width}/${v.format}`;
  if (seen.has(key)) problems.push(`${key}: variante en double`);
  seen.add(key);
  total += bytes.length;
  if (bytes.length !== v.byte_size) problems.push(`${v.storage_path}: poids différent de l'index`);
  if (sha256(bytes) !== v.sha256) problems.push(`${v.storage_path}: empreinte différente`);
  if (v.format === "webp") {
    if (bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP")
      problems.push(`${v.storage_path}: signature WebP invalide`);
    const bad = webpChunks(bytes).filter((chunk) => ["EXIF", "XMP ", "ICCP"].includes(chunk));
    if (bad.length) problems.push(`${v.storage_path}: métadonnées ${bad.join(",")}`);
  } else if (v.format === "avif") {
    if (bytes.toString("latin1", 4, 8) !== "ftyp" || !["avif", "avis"].includes(bytes.toString("latin1", 8, 12)))
      problems.push(`${v.storage_path}: signature AVIF invalide`);
  } else problems.push(`${v.storage_path}: format inconnu`);
  const meta = await sharp(bytes).metadata();
  // libvips/sharp expose les fichiers AVIF sous le nom de famille « heif ».
  if (meta.format !== (v.format === "avif" ? "heif" : "webp") || meta.width !== v.width || meta.height !== v.height)
    problems.push(`${v.storage_path}: format ou dimensions différents`);
  if (meta.exif || meta.icc || meta.xmp || meta.iptc || meta.orientation)
    problems.push(`${v.storage_path}: métadonnées présentes`);
  if (!/^galleries\/[a-z]+\/[0-9a-f]{12}\/[0-9a-f]{8}-\d+\.(avif|webp)$/.test(v.storage_path)
      || !v.storage_path.endsWith(`.${v.format}`))
    problems.push(`${v.storage_path}: clé inattendue`);
  const size = v.width <= 400 ? "400" : v.width <= 800 ? "800" : "1600";
  const bucket = `${v.format}/${size}`;
  const current = summary.get(bucket) ?? { n: 0, bytes: 0 };
  summary.set(bucket, { n: current.n + 1, bytes: current.bytes + bytes.length });
}

for (const photo of manifest.photos) {
  if ("source_file" in photo || !["original", "fallback_webp"].includes(photo.source_kind) ||
      (photo.source_kind === "original" && !/^[0-9a-f]{64}$/.test(photo.original_sha256 ?? ""))) {
    problems.push(`${photo.source_key}: provenance absente ou chemin privé dans le manifeste`);
  }
  const widths = [...new Set([400, 800, 1600].map((width) => Math.min(width, photo.width)))];
  for (const width of widths) for (const format of manifest.variant_formats) {
    if (!seen.has(`${photo.source_key}/${width}/${format}`))
      problems.push(`${photo.source_key}: variante ${width} ${format} absente`);
  }
}
const expected = manifest.photos.reduce((n, photo) =>
  n + new Set([400, 800, 1600].map((width) => Math.min(width, photo.width))).size * 2, 0);
if (variants.length !== expected) problems.push(`${variants.length} variantes au lieu de ${expected}`);

const indexedFiles = new Set(variants.map((variant) => path.join(VARIANTS_DIR, variant.file)));
async function checkUnindexed(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkUnindexed(file);
    else if (entry.isFile() && /\.(avif|webp)$/.test(entry.name) && !indexedFiles.has(file))
      problems.push(`${path.relative(VARIANTS_DIR, file)}: fichier hors index`);
  }
}
await checkUnindexed(path.join(VARIANTS_DIR, "files"));

console.log(`Photos : ${manifest.photos.length} — variantes : ${variants.length} — poids : ${(total / 1e6).toFixed(1)} Mo`);
for (const [name, data] of [...summary].sort())
  console.log(`  ${name}: ${data.n} fichiers, ${(data.bytes / 1e6).toFixed(1)} Mo`);
if (problems.length) {
  for (const problem of problems.slice(0, 30)) console.error("-", problem);
  throw new Error(`${problems.length} problème(s) dans les variantes.`);
}
console.log("Dimensions, poids, empreintes et métadonnées vérifiés sur chaque fichier.");
