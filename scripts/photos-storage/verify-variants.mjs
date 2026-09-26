// Vérifie les variantes générées : nombre, dimensions, poids, empreintes, absence de métadonnées
// (aucun bloc EXIF / XMP / ICC dans les fichiers webp) et clés de stockage sans nom de client.
// Usage : node scripts/photos-storage/verify-variants.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { VARIANTS_DIR, readManifest, sha256 } from "./lib.mjs";

const manifest = await readManifest();
const { variants } = JSON.parse(
  await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"),
);
const problems = [];
const perWidth = new Map();
let total = 0;

function chunks(buffer) {
  const found = [];
  let pos = 12;
  while (pos < buffer.length) {
    found.push(buffer.toString("latin1", pos, pos + 4));
    pos += 8 + buffer.readUInt32LE(pos + 4) + (buffer.readUInt32LE(pos + 4) & 1);
  }
  return found;
}

for (const v of variants) {
  const bytes = await readFile(path.join(VARIANTS_DIR, v.file));
  total += bytes.length;
  if (bytes.length !== v.byte_size) problems.push(`${v.storage_path}: poids différent de l'index`);
  if (sha256(bytes) !== v.sha256) problems.push(`${v.storage_path}: empreinte différente`);
  if (bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") {
    problems.push(`${v.storage_path}: pas un webp`);
  }
  const bad = chunks(bytes).filter((c) => ["EXIF", "XMP ", "ICCP"].includes(c));
  if (bad.length) problems.push(`${v.storage_path}: métadonnées ${bad.join(",")}`);
  const meta = await sharp(bytes).metadata();
  if (meta.width !== v.width || meta.height !== v.height)
    problems.push(`${v.storage_path}: dimensions différentes`);
  if (meta.exif || meta.icc || meta.xmp)
    problems.push(`${v.storage_path}: métadonnées lues par sharp`);
  if (!/^galleries\/[a-z]+\/[0-9a-f]{12}\/[0-9a-f]{8}-\d+\.webp$/.test(v.storage_path)) {
    problems.push(`${v.storage_path}: clé inattendue`);
  }
  const stat = perWidth.get(v.width) ?? { n: 0, bytes: 0 };
  stat.n += 1;
  stat.bytes += bytes.length;
  perWidth.set(v.width, stat);
}

const bySource = new Map();
for (const v of variants) bySource.set(v.source_key, (bySource.get(v.source_key) ?? 0) + 1);
for (const photo of manifest.photos) {
  const n = bySource.get(photo.source_key) ?? 0;
  const expected = 1 + [400, 800].filter((w) => w < photo.width).length;
  if (n !== expected) problems.push(`${photo.source_key}: ${n} variantes au lieu de ${expected}`);
}

console.log(
  `Photos : ${manifest.photos.length} — variantes : ${variants.length} — poids total : ${(total / 1e6).toFixed(1)} Mo`,
);
const widths = [...perWidth.entries()].sort((a, b) => a[0] - b[0]);
const summary = new Map();
for (const [w, s] of widths) {
  const label = w <= 400 ? "400" : w <= 800 ? "800" : "natif";
  const cur = summary.get(label) ?? { n: 0, bytes: 0 };
  cur.n += s.n;
  cur.bytes += s.bytes;
  summary.set(label, cur);
}
for (const [label, s] of summary) {
  console.log(
    `  ${label.padEnd(5)} : ${String(s.n).padStart(3)} fichiers, ${(s.bytes / 1e6).toFixed(1)} Mo, ${Math.round(s.bytes / s.n / 1000)} Ko en moyenne`,
  );
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLÈME(S) :`);
  for (const p of problems.slice(0, 20)) console.log(" -", p);
  process.exit(1);
}
console.log(
  "Aucun problème : dimensions, poids, empreintes et absence de métadonnées vérifiés sur chaque fichier.",
);
