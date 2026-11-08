// Compare visuellement chaque WebP du manifeste aux originaux de ../soleana-originaux/galeries/.
// Aucune dépendance aux noms : corrélation des pixels, puis empreinte SHA-256 du fichier retenu.
// Les chemins privés restent hors dépôt. En cas d'absence, la source WebP actuelle est conservée.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GALLERIES, MANIFEST_PATH, ROOT, VARIANTS_DIR, listGalleryFiles, readManifest, sha256 } from "./lib.mjs";

const ORIGINALS_DIR = path.resolve(ROOT, "../soleana-originaux/galeries");
const MATCHES_PATH = path.join(VARIANTS_DIR, "original-matches.json");
const REPORT_PATH = path.join(VARIANTS_DIR, "matching-report.csv");
const MATCH_THRESHOLD = 0.95;
const REVIEW_GAP = 0.01;
const SIZE = 64;

if (path.relative(ROOT, ORIGINALS_DIR).split(path.sep)[0] !== "..") {
  throw new Error("Les originaux doivent rester hors du dépôt.");
}

async function signature(file) {
  const pixels = await sharp(file).rotate().resize(SIZE, SIZE, { fit: "fill" }).grayscale().raw().toBuffer();
  const values = Float64Array.from(pixels);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  let squared = 0;
  for (let i = 0; i < values.length; i++) {
    values[i] -= mean;
    squared += values[i] * values[i];
  }
  return { values, norm: Math.sqrt(squared) };
}

function correlation(left, right) {
  if (!left.norm || !right.norm) return -1;
  let dot = 0;
  for (let i = 0; i < left.values.length; i++) dot += left.values[i] * right.values[i];
  return dot / (left.norm * right.norm);
}

function orientedDimensions(metadata) {
  const swapped = [5, 6, 7, 8].includes(metadata.orientation);
  return { width: swapped ? metadata.height : metadata.width, height: swapped ? metadata.width : metadata.height };
}

const manifest = await readManifest();
if (manifest.version !== 3 || manifest.photos.length !== 170) throw new Error("Manifeste phase 1 inattendu.");

// Retrouver les sources WebP par leur contenu, sans inscrire leurs noms dans le manifeste.
const webpsByHash = new Map();
for (const gallery of GALLERIES) for (const file of await listGalleryFiles(gallery)) {
  const fullPath = path.join(ROOT, file.rel);
  const hash = sha256(await readFile(fullPath));
  if (!webpsByHash.has(hash)) webpsByHash.set(hash, fullPath);
}

const originalPaths = [];
for (const folder of await readdir(ORIGINALS_DIR, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue; // logos à la racine exclus
  for (const entry of await readdir(path.join(ORIGINALS_DIR, folder.name), { withFileTypes: true })) {
    if (entry.isFile() && /\.(jpe?g|png|webp)$/i.test(entry.name)) {
      originalPaths.push(path.join(ORIGINALS_DIR, folder.name, entry.name));
    }
  }
}

const originalsByHash = new Map();
for (const fullPath of originalPaths) {
  const hash = sha256(await readFile(fullPath));
  const existing = originalsByHash.get(hash);
  // Deux fichiers binaires identiques : préférer le chemin le plus court, sans double import.
  if (existing && existing.length <= fullPath.length) continue;
  originalsByHash.set(hash, fullPath);
}
const originals = [];
for (const [hash, fullPath] of originalsByHash) {
  originals.push({ hash, fullPath, signature: await signature(fullPath), metadata: await sharp(fullPath).metadata() });
}

const matches = [];
for (const photo of manifest.photos) {
  const webpPath = webpsByHash.get(photo.source_sha256);
  if (!webpPath) throw new Error(`Source WebP du manifeste introuvable : ${photo.source_key}`);
  const sourceSignature = await signature(webpPath);
  const ranked = originals.map((item) => ({ item, score: correlation(sourceSignature, item.signature) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  const found = best && best.score >= MATCH_THRESHOLD;
  const chosenPath = found ? best.item.fullPath : webpPath;
  const chosenHash = found ? best.item.hash : photo.source_sha256;
  const metadata = found ? best.item.metadata : await sharp(webpPath).metadata();
  const { width, height } = orientedDimensions(metadata);
  const score = found ? best.score : null;
  const secondScore = second?.score ?? null;
  const status = !found ? "no_original" : score - secondScore < REVIEW_GAP ? "review" : "matched";
  Object.assign(photo, {
    source_kind: found ? "original" : "fallback_webp",
    original_sha256: found ? chosenHash : null,
    width,
    height,
  });
  matches.push({
    source_key: photo.source_key,
    source_webp: path.relative(ROOT, webpPath),
    source_sha256: photo.source_sha256,
    selected_file: path.relative(path.dirname(ROOT), chosenPath),
    selected_sha256: chosenHash,
    score,
    second_score: secondScore,
    status,
  });
}

const usedOriginals = matches.filter((match) => match.status !== "no_original");
if (new Set(usedOriginals.map((match) => match.selected_sha256)).size !== usedOriginals.length) {
  throw new Error("Un même original a été associé à plusieurs photos distinctes.");
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csvRows = [
  ["photo_manifeste", "original_retenu", "score_ressemblance_pct", "deuxieme_score_pct", "statut"],
  ...matches.map((match) => [
    match.source_key,
    match.selected_file,
    match.score === null ? "" : (match.score * 100).toFixed(3),
    match.second_score === null ? "" : (match.second_score * 100).toFixed(3),
    match.status,
  ]),
];
await mkdir(VARIANTS_DIR, { recursive: true });
await writeFile(MATCHES_PATH, `${JSON.stringify({ version: 1, matches }, null, 2)}\n`);
await writeFile(REPORT_PATH, `${csvRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${matches.length} photos comparées à ${originalPaths.length} fichiers (${originals.length} originaux distincts).`);
console.log(`${usedOriginals.length} originaux retenus, ${matches.filter((match) => match.status === "no_original").length} repli WebP, ${matches.filter((match) => match.status === "review").length} correspondance(s) à vérifier.`);
console.log(`Score minimal retenu : ${(Math.min(...usedOriginals.map((match) => match.score)) * 100).toFixed(3)} %`);
console.log(`Tableau privé hors dépôt : ${REPORT_PATH}`);
