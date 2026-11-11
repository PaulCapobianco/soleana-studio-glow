// Manifeste et simulation (dry-run) d'import des photos de Noël 2026 vers le contexte « event ».
// LECTURE SEULE : lit src/assets/noel-2026, écrit uniquement docs/photos-storage/manifest-noel-event.json.
// Aucun réseau, aucune clé, aucune écriture Supabase, aucune modification de legacy-noel.ts.
// Usage : node scripts/photos-storage/noel-event-manifest.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ASSETS, ROOT, sha256 } from "./lib.mjs";

const DIR = path.join(ASSETS, "noel-2026");
const OUT = path.join(ROOT, "docs/photos-storage/manifest-noel-event.json");
const EVENT_SLUG = "mini-seances-noel-2026";
// Regroupement par préfixe de fichier ; les titres sont des PROPOSITIONS à valider par Paul.
const GROUPS = [
  { prefix: "noel-s01-", slot: "galerie-1", title: "Séance 1" },
  { prefix: "noel-s02-", slot: "galerie-2", title: "Séance 2" },
  { prefix: "noel-s03-", slot: "galerie-3", title: "Séance 3" },
  { prefix: "noel-s04-", slot: "galerie-4", title: "Séance 4" },
  { prefix: "noel-decor-", slot: "galerie-5", title: "Décor" },
];

const names = (await readdir(DIR)).filter((n) => n.endsWith(".webp")).sort();
const base = names.filter((n) => !/-(1600|2400)\.webp$/.test(n) && !n.startsWith("noel-hero"));
const photos = [];
const placements = [];
const bySha = new Map();
for (const group of GROUPS) {
  const files = base.filter((n) => n.startsWith(group.prefix));
  for (const [index, file] of files.entries()) {
    const stem = file.replace(/\.webp$/, "");
    // Source de l'import : la plus grande variante du dépôt (1600 px) ; pas d'original Noël hors dépôt.
    const largest = names.includes(`${stem}-1600.webp`) ? `${stem}-1600.webp` : file;
    const bytes = await readFile(path.join(DIR, largest));
    const hash = sha256(bytes);
    const meta = await sharp(bytes).metadata();
    let photo = bySha.get(hash);
    if (!photo) {
      photo = {
        source_key: `galleries/evenement/${hash.slice(0, 12)}`,
        source_file: `src/assets/noel-2026/${largest}`,
        source_sha256: hash,
        width: meta.width,
        height: meta.height,
        alt_text: `${group.title} — mini-séances de Noël 2026`,
      };
      bySha.set(hash, photo);
      photos.push(photo);
    }
    placements.push({
      placement_key: `events/${EVENT_SLUG}/${group.slot}/${hash.slice(0, 12)}`,
      source_key: photo.source_key,
      context_type: "event",
      event_slug: EVENT_SLUG,
      slot: group.slot,
      display_order: index,
      object_position_x_pct: 50,
      object_position_y_pct: 50,
    });
  }
}
const covered = GROUPS.reduce((n, g) => n + base.filter((f) => f.startsWith(g.prefix)).length, 0);
const report = {
  event_slug: EVENT_SLUG,
  galleries: GROUPS.map((g) => ({ slot: g.slot, title: g.title, count: placements.filter((p) => p.slot === g.slot).length })),
  photos: photos.length,
  placements: placements.length,
  files_in_folder: names.length,
  ignored_hero_files: names.filter((n) => n.startsWith("noel-hero")).length,
  planned_variants: photos.length * 8,
};
await writeFile(OUT, JSON.stringify({ report, photos, placements }, null, 2) + "\n");
console.log("Simulation — rien n'est importé, publié ni modifié.");
console.log(JSON.stringify(report, null, 2));
if (covered !== placements.length) throw new Error("Incohérence manifeste");
