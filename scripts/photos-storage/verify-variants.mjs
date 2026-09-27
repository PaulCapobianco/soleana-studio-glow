// Vérifie dimensions, poids, empreintes, formats et absence de métadonnées des variantes locales.
// Usage : node scripts/photos-storage/verify-variants.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { VARIANTS_DIR, readManifest, sha256 } from "./lib.mjs";

const manifest = await readManifest();
const index = JSON.parse(await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"));
const variants = index.variants;
if (manifest.version !== 2 || index.version !== 2) throw new Error("Manifeste ou index obsolète.");
const problems = [];
const summary = new Map();
const seen = new Set();
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
  const size = v.width <= 400 ? "400" : v.width <= 800 ? "800" : "native";
  const bucket = `${v.format}/${size}`;
  const current = summary.get(bucket) ?? { n: 0, bytes: 0 };
  summary.set(bucket, { n: current.n + 1, bytes: current.bytes + bytes.length });
}

for (const photo of manifest.photos) {
  const widths = [...new Set([400, 800].filter((width) => width < photo.width).concat(photo.width))];
  for (const width of widths) for (const format of manifest.variant_formats) {
    if (!seen.has(`${photo.source_key}/${width}/${format}`))
      problems.push(`${photo.source_key}: variante ${width} ${format} absente`);
  }
}
const expected = manifest.photos.reduce((n, photo) =>
  n + (1 + [400, 800].filter((width) => width < photo.width).length) * 2, 0);
if (variants.length !== expected) problems.push(`${variants.length} variantes au lieu de ${expected}`);

console.log(`Photos : ${manifest.photos.length} — variantes : ${variants.length} — poids : ${(total / 1e6).toFixed(1)} Mo`);
for (const [name, data] of [...summary].sort())
  console.log(`  ${name}: ${data.n} fichiers, ${(data.bytes / 1e6).toFixed(1)} Mo`);
if (problems.length) {
  for (const problem of problems.slice(0, 30)) console.error("-", problem);
  throw new Error(`${problems.length} problème(s) dans les variantes.`);
}
console.log("Dimensions, poids, empreintes et métadonnées vérifiés sur chaque fichier.");
