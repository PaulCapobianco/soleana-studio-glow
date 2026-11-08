// Définition des galeries de la phase 1 et utilitaires communs aux scripts de préparation.
// Lecture locale uniquement : aucun de ces utilitaires n'écrit dans src/ ni ne contacte un réseau.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const ASSETS = path.join(ROOT, "src/assets");
export const MANIFEST_PATH = path.join(ROOT, "docs/photos-storage/manifest-phase1.json");
// Sorties générées : HORS dépôt, à côté des originaux.
export const VARIANTS_DIR = path.resolve(ROOT, "../soleana-originaux/storage-variants");

/**
 * Chaque galerie reproduit celle de src/routes/$slug.tsx : mêmes dossiers, même préfixe de texte
 * alternatif, même tri (localeCompare sur le nom de fichier sans extension).
 * Le cadrage des galeries actuelles est celui par défaut (object-cover centré) : 50 % / 50 %.
 */
export const GALLERIES = [
  {
    seo: "photographe-grossesse-marseille",
    category: "grossesse",
    slot: "gallery-1",
    dirs: ["grossesse/grossesse_1"],
    prefix: "Séance photo maternité à Marseille",
  },
  {
    seo: "photographe-grossesse-marseille",
    category: "grossesse",
    slot: "gallery-2",
    dirs: ["grossesse/maternite_2"],
    prefix: "Séance photo maternité à Marseille",
  },
  {
    seo: "photographe-famille-marseille",
    category: "famille",
    slot: "gallery-1",
    dirs: ["famille/famille_1", "famille/famille_2"],
    prefix: "Séance photo famille à Marseille",
  },
  {
    seo: "photographe-famille-marseille",
    category: "famille",
    slot: "gallery-2",
    dirs: ["famille/famille_2"],
    prefix: "Séance photo famille à Marseille",
  },
  {
    seo: "photographe-couple-marseille",
    category: "couple",
    slot: "gallery-1",
    dirs: ["couple/couple_1"],
    prefix: "Séance photo couple à Marseille",
  },
  {
    seo: "photographe-couple-marseille",
    category: "couple",
    slot: "gallery-2",
    dirs: ["couple/couple_2"],
    prefix: "Séance photo couple à Marseille",
  },
  {
    seo: "photographe-couple-marseille",
    category: "couple",
    slot: "gallery-3",
    dirs: ["couple/couple_3"],
    prefix: "Séance photo couple à Marseille",
  },
  {
    seo: "photographe-portrait-marseille",
    category: "portrait",
    slot: "gallery-1",
    dirs: ["portrait/portrait_1"],
    prefix: "Séance photo portrait à Marseille",
  },
];

export const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** Fichiers .webp d'une galerie, triés comme le code du site (clé = nom sans extension). */
export async function listGalleryFiles(gallery) {
  const entries = [];
  for (const dir of gallery.dirs) {
    for (const file of await readdir(path.join(ASSETS, dir))) {
      if (!file.endsWith(".webp")) continue;
      entries.push({ key: file.replace(".webp", ""), rel: `src/assets/${dir}/${file}` });
    }
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export async function readManifest() {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

/** Clé de stockage immuable d'une variante, versionnée par le contenu. */
export const variantPath = (sourceKey, hash8, width, format) =>
  `${sourceKey}/${hash8}-${width}.${format}`;

export const pad = (n, size = 3) => String(n).padStart(size, "0");
