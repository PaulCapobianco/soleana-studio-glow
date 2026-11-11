// Variantes AVIF + WebP (4 largeurs, profil q55 comme les 170 photos de galeries) des photos de
// Noël, à partir des WebP 1600 px du dépôt (pas d'original Noël hors dépôt).
//
// SIMULATION PAR DÉFAUT : encode en mémoire, affiche nombre et poids, n'écrit RIEN.
//   node scripts/photos-storage/generate-event-variants.mjs                 (simulation, 4 photos)
//   node scripts/photos-storage/generate-event-variants.mjs --all           (simulation complète)
//   node scripts/photos-storage/generate-event-variants.mjs --all --write   (écrit les fichiers)
// --write écrit hors dépôt : ../soleana-originaux/storage-variants/noel-event/ (+ variants-index.json).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ROOT, VARIANTS_DIR, sha256 } from "./lib.mjs";
import { buildEventImportPlan, eventVariantPath } from "./event-import-plan.mjs";
import { expectedWidthsFor, FORMATS, getQualityProfile } from "./quality-profiles.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const all = args.includes("--all");
if (write && !all)
  throw new Error("--write exige --all (le lot complet est écrit d'un seul coup).");

const manifest = JSON.parse(
  await readFile(path.join(ROOT, "docs/photos-storage/manifest-noel-event.json"), "utf8"),
);
const plan = buildEventImportPlan(manifest, { limit: all ? undefined : 4 });
const profile = getQualityProfile("q55");
const OUT_DIR = path.join(VARIANTS_DIR, "noel-event");
const perPhoto = [];
let total = 0;
let done = 0;
let next = 0;

async function encodePhoto(photo, position) {
  const bytes = await readFile(path.join(ROOT, photo.source_file));
  if (sha256(bytes) !== photo.source_sha256) {
    throw new Error(`Le fichier source a changé depuis le manifeste : ${photo.source_file}`);
  }
  const own = [];
  for (const width of expectedWidthsFor(photo.width)) {
    for (const format of FORMATS) {
      const pipeline = sharp(bytes).rotate().resize({ width, withoutEnlargement: true });
      const { data, info } = await (
        format === "avif" ? pipeline.avif(profile.avif) : pipeline.webp(profile.webp)
      ).toBuffer({ resolveWithObject: true });
      const hash = sha256(data);
      const storagePath = eventVariantPath(photo.source_key, hash.slice(0, 8), info.width, format);
      total += data.length;
      own.push({
        source_key: photo.source_key,
        source_sha256: photo.source_sha256,
        format,
        width: info.width,
        height: info.height,
        byte_size: data.length,
        sha256: hash,
        storage_path: storagePath,
        file: path.join("noel-event", storagePath),
      });
      if (write) {
        const target = path.join(OUT_DIR, storagePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, data);
      }
    }
  }
  perPhoto[position] = own;
  done += 1;
  if (done % 10 === 0 || done === plan.photos.length)
    console.log(`${done}/${plan.photos.length} photos encodées`);
}

// 6 photos en parallèle (l'encodage AVIF est lent) ; l'ordre de l'index suit celui du manifeste.
await Promise.all(
  Array.from({ length: Math.min(6, plan.photos.length) }, async () => {
    while (next < plan.photos.length) {
      const position = next++;
      await encodePhoto(plan.photos[position], position);
    }
  }),
);
const index = perPhoto.flat();

console.log(
  `${write ? "ÉCRIT" : "SIMULATION (rien n'est écrit)"} : ${index.length} variantes pour ${plan.photos.length} photos, ${(total / 1e6).toFixed(1)} Mo (attendu : ${plan.variantCount} variantes)`,
);
if (index.length !== plan.variantCount) throw new Error("Nombre de variantes inattendu.");
const paths = new Set(index.map((v) => v.storage_path));
if (paths.size !== index.length) throw new Error("Chemins Storage en double.");
if (write) {
  await writeFile(
    path.join(OUT_DIR, "variants-index.json"),
    `${JSON.stringify({ version: 1, event_slug: plan.eventSlug, profile: "q55", generated_at: new Date().toISOString(), variants: index }, null, 2)}\n`,
  );
  console.log(`Index : ${path.join(OUT_DIR, "variants-index.json")}`);
}
