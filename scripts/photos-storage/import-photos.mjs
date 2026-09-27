// Import des photos des galeries (phase 1) vers Supabase Storage + tables photos /
// photo_variants / photo_placements.
//
// MODE SIMULATION PAR DÉFAUT : sans --apply, le script ne contacte AUCUN service et n'écrit rien
// dans la base ni dans Storage ; il affiche ce qu'il enverrait et insérerait et écrit un journal
// prévisionnel (hors dépôt).
//
// Mode réel (à lancer uniquement par Paul, d'abord sur 3 ou 4 photos) :
//   export SUPABASE_URL=https://<projet>.supabase.co
//   read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo; export SUPABASE_SERVICE_ROLE_KEY
//   node scripts/photos-storage/import-photos.mjs --apply --confirm <projet>.supabase.co --limit 4
// Le script ne lit aucun fichier .env. Il n'écrase jamais un objet (upsert: false), ne supprime
// rien, saute ce qui existe déjà (reprise possible) et journalise chaque création dans
// ../soleana-originaux/storage-variants/journals/ pour le retour arrière (rollback-import.mjs).
//
// Options : --limit N | --only cle1,cle2 | --publish (placements visibles dès l'insertion,
// sinon ils restent non publiés) | --publish-existing (met seulement published = true sur les
// placements du manifeste déjà importés).
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { VARIANTS_DIR, readManifest, sha256 } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const apply = flag("--apply");
const publish = flag("--publish");
const publishExisting = flag("--publish-existing");
const limit = option("--limit") ? Number(option("--limit")) : undefined;
const only = option("--only")?.split(",").filter(Boolean);
const BUCKET = "photos";
if (option("--limit") && (!Number.isSafeInteger(limit) || limit < 1)) {
  throw new Error("--limit doit être un entier positif.");
}

const manifest = await readManifest();
const index = JSON.parse(
  await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"),
);
const { variants } = index;
if (index.version !== 3) throw new Error("Variantes obsolètes : relancer generate-variants.mjs.");
if (manifest.version !== 3 || manifest.variant_formats?.join(",") !== "avif,webp") {
  throw new Error("Manifeste AVIF/WebP manquant : régénérer le manifeste et les variantes.");
}
const variantsBySource = new Map();
const storagePaths = new Map();
for (const v of variants) {
  if (storagePaths.has(v.storage_path)) {
    throw new Error(`Clé Storage en double ${v.storage_path} (${storagePaths.get(v.storage_path)} / ${v.source_key}).`);
  }
  storagePaths.set(v.storage_path, v.source_key);
  if (!variantsBySource.has(v.source_key)) variantsBySource.set(v.source_key, []);
  variantsBySource.get(v.source_key).push(v);
}
for (const photo of manifest.photos) {
  const own = variantsBySource.get(photo.source_key) ?? [];
  const expected = 2 * new Set([400, 800, 1600].map((width) => Math.min(width, photo.width))).size;
  if (own.length !== expected || own.some((v) => !["avif", "webp"].includes(v.format))) {
    throw new Error(`Variantes incomplètes pour ${photo.source_key} : exécuter verify-variants.mjs.`);
  }
}

let selected = manifest.photos;
if (only?.length) selected = selected.filter((p) => only.includes(p.source_key));
if (limit) selected = selected.slice(0, limit);
const selectedKeys = new Set(selected.map((p) => p.source_key));
const selectedPlacements = manifest.placements.filter((p) => selectedKeys.has(p.source_key));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const journalDir = path.join(VARIANTS_DIR, "journals");
await mkdir(journalDir, { recursive: true });
const journalFile = path.join(journalDir, `${apply ? "import" : "dry-run"}-${stamp}.jsonl`);
async function journal(entry) {
  await appendFile(journalFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

const mb = (bytes) => `${(bytes / 1e6).toFixed(2)} Mo`;
const plannedUploads = selected.flatMap((p) => variantsBySource.get(p.source_key) ?? []);
console.log(apply ? "MODE RÉEL" : "SIMULATION (aucune écriture ; ajouter --apply pour exécuter)");
console.log(`Photos sélectionnées : ${selected.length} / ${manifest.photos.length}`);
console.log(
  `Variantes à envoyer   : ${plannedUploads.length} (${mb(plannedUploads.reduce((s, v) => s + v.byte_size, 0))})`,
);
console.log(`Emplacements          : ${selectedPlacements.length} (published = ${publish})`);

// ---------- Simulation ----------
if (!apply) {
  if (publishExisting) {
    console.log(
      "\n[simulation] UPDATE photo_placements SET published = true pour les placement_key du manifeste :",
    );
    console.log(
      `  ${manifest.placements.length} clés (seules les lignes déjà importées seraient modifiées)`,
    );
  }
  for (const photo of selected) {
    console.log(`\nPHOTO ${photo.source_key}  (${photo.category}, ${photo.width}x${photo.height})`);
    for (const v of variantsBySource.get(photo.source_key) ?? []) {
      console.log(
        `  UPLOAD  ${BUCKET}/${v.storage_path}  ${v.width}x${v.height}  ${(v.byte_size / 1000).toFixed(0)} Ko`,
      );
      await journal({ op: "upload", path: v.storage_path, bytes: v.byte_size, planned: true });
    }
    console.log(
      `  INSERT  photos            source_key=${photo.source_key} category=${photo.category} published=true alt="${photo.alt_text}"`,
    );
    await journal({ op: "insert_photo", source_key: photo.source_key, planned: true });
    for (const v of variantsBySource.get(photo.source_key) ?? []) {
      console.log(
        `  INSERT  photo_variants    ${v.storage_path} (${v.width}x${v.height}, sha256 ${v.sha256.slice(0, 12)}…)`,
      );
      await journal({ op: "insert_variant", path: v.storage_path, planned: true });
    }
    for (const pl of selectedPlacements.filter((p) => p.source_key === photo.source_key)) {
      console.log(
        `  INSERT  photo_placements  ${pl.placement_key} order=${pl.display_order} alt="${pl.alt}" x/y=${pl.object_position_x_pct}/${pl.object_position_y_pct}`,
      );
      await journal({ op: "insert_placement", placement_key: pl.placement_key, planned: true });
    }
  }
  console.log(`\nJournal prévisionnel : ${journalFile}`);
  console.log("Rien n'a été envoyé ni inséré.");
  process.exit(0);
}

// ---------- Mode réel ----------
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être exportées dans le shell.",
  );
const host = new URL(url).host;
if (option("--confirm") !== host) {
  throw new Error(`Confirmation requise : ajoutez --confirm ${host} (projet visé : ${host}).`);
}
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const must = (result, what) => {
  if (result.error) throw new Error(`${what} : ${result.error.message}`);
  return result.data;
};

if (publishExisting) {
  const keys = manifest.placements.map((p) => p.placement_key);
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const unpublished = must(
      await db.from("photo_placements").select("placement_key").in("placement_key", chunk).eq("published", false),
      "lecture des emplacements non publiés",
    );
    if (unpublished.length === 0) continue;
    const rows = must(
      await db
        .from("photo_placements")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in("placement_key", unpublished.map((row) => row.placement_key))
        .eq("published", false)
        .select("placement_key"),
      "publication des emplacements",
    );
    for (const r of rows)
      await journal({ op: "publish_placement", placement_key: r.placement_key, previous_published: false, updated: true });
  }
  console.log("Emplacements du manifeste publiés.");
  process.exit(0);
}

const categories = new Map(
  must(await db.from("categories").select("id, slug"), "catégories").map((c) => [c.slug, c.id]),
);
const seoPages = new Map(
  must(await db.from("seo_pages").select("id, slug"), "pages SEO").map((s) => [s.slug, s.id]),
);
const publicUrl = (p) => db.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

let created = { objects: 0, photos: 0, variants: 0, placements: 0 };
for (const [n, photo] of selected.entries()) {
  const categoryId = categories.get(photo.category);
  if (!categoryId) throw new Error(`Catégorie introuvable : ${photo.category}`);
  const own = variantsBySource.get(photo.source_key) ?? [];

  // 1) Objets Storage (jamais d'écrasement).
  for (const v of own) {
    const bytes = await readFile(path.join(VARIANTS_DIR, v.file));
    const { error } = await db.storage.from(BUCKET).upload(v.storage_path, bytes, {
      contentType: `image/${v.format}`,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      if (/already exists|Duplicate|409/i.test(`${error.message} ${error.statusCode ?? ""}`)) {
        const { data: existing, error: downloadError } = await db.storage.from(BUCKET).download(v.storage_path);
        if (downloadError || !existing) {
          throw new Error(`Objet déjà présent, mais illisible pour vérifier sa reprise : ${v.storage_path}`);
        }
        const existingBytes = Buffer.from(await existing.arrayBuffer());
        if (existingBytes.length !== v.byte_size || sha256(existingBytes) !== v.sha256) {
          throw new Error(`Objet déjà présent avec un contenu différent ; aucun écrasement effectué : ${v.storage_path}`);
        }
        await journal({
          op: "upload",
          path: v.storage_path,
          created: false,
          verified: true,
          skipped: "existe déjà avec taille et SHA-256 concordants",
        });
        continue;
      }
      throw new Error(`Envoi ${v.storage_path} : ${error.message}`);
    }
    created.objects += 1;
    await journal({ op: "upload", path: v.storage_path, created: true });
  }

  // 2) Photo (reprise possible grâce à source_key).
  let photoRow = must(
    await db.from("photos").select("id, category_id, alt_text, image_url").eq("source_key", photo.source_key).maybeSingle(),
    "lecture photo",
  );
  const largest = own.filter((v) => v.format === "webp").reduce((a, b) => (b.width > a.width ? b : a));
  const expectedImageUrl = publicUrl(largest.storage_path);
  if (!photoRow) {
    photoRow = must(
      await db
        .from("photos")
        .insert({
          image_url: expectedImageUrl,
          alt_text: photo.alt_text,
          category_id: categoryId,
          published: true,
          on_home: false,
          on_portfolio: false,
          display_order: n,
          source_key: photo.source_key,
        })
        .select("id")
        .single(),
      "insertion photo",
    );
    created.photos += 1;
    await journal({
      op: "insert_photo",
      id: photoRow.id,
      source_key: photo.source_key,
      created: true,
    });
  } else {
    if (photoRow.category_id !== categoryId || photoRow.alt_text !== photo.alt_text || photoRow.image_url !== expectedImageUrl) {
      throw new Error(`Photo déjà présente avec des données divergentes : ${photo.source_key}`);
    }
    await journal({
      op: "insert_photo",
      id: photoRow.id,
      source_key: photo.source_key,
      created: false,
      skipped: "existe déjà",
    });
  }

  // 3) Variantes.
  for (const v of own) {
    const exists = must(
      await db.from("photo_variants").select("id, photo_id, format, width, height, byte_size, sha256").eq("storage_path", v.storage_path).maybeSingle(),
      "lecture variante",
    );
    if (exists) {
      if (exists.photo_id !== photoRow.id || exists.format !== v.format || exists.width !== v.width ||
          exists.height !== v.height || exists.byte_size !== v.byte_size || exists.sha256 !== v.sha256) {
        throw new Error(`Variante déjà présente avec des données divergentes : ${v.storage_path}`);
      }
      continue;
    }
    const row = must(
      await db
        .from("photo_variants")
        .insert({
          photo_id: photoRow.id,
          storage_path: v.storage_path,
          format: v.format,
          width: v.width,
          height: v.height,
          byte_size: v.byte_size,
          sha256: v.sha256,
        })
        .select("id")
        .single(),
      "insertion variante",
    );
    created.variants += 1;
    await journal({ op: "insert_variant", id: row.id, path: v.storage_path, created: true });
  }

  // 4) Emplacements.
  for (const pl of selectedPlacements.filter((p) => p.source_key === photo.source_key)) {
    const seoId = seoPages.get(pl.seo_slug);
    if (!seoId) throw new Error(`Page SEO introuvable : ${pl.seo_slug}`);
    const exists = must(
      await db
        .from("photo_placements")
        .select("id, photo_id, seo_page_id, slot, display_order, object_position_x_pct, object_position_y_pct, alt_text_override, published")
        .eq("placement_key", pl.placement_key)
        .maybeSingle(),
      "lecture emplacement",
    );
    if (exists) {
      if (exists.photo_id !== photoRow.id || exists.seo_page_id !== seoId || exists.slot !== pl.slot ||
          exists.display_order !== pl.display_order || Number(exists.object_position_x_pct) !== pl.object_position_x_pct ||
          Number(exists.object_position_y_pct) !== pl.object_position_y_pct || exists.alt_text_override !== pl.alt ||
          exists.published !== publish) {
        throw new Error(`Emplacement déjà présent avec des données divergentes : ${pl.placement_key}`);
      }
      continue;
    }
    const row = must(
      await db
        .from("photo_placements")
        .insert({
          placement_key: pl.placement_key,
          photo_id: photoRow.id,
          context_type: "seo",
          seo_page_id: seoId,
          slot: pl.slot,
          display_order: pl.display_order,
          object_position_x_pct: pl.object_position_x_pct,
          object_position_y_pct: pl.object_position_y_pct,
          alt_text_override: pl.alt,
          published: publish,
        })
        .select("id")
        .single(),
      "insertion emplacement",
    );
    created.placements += 1;
    await journal({
      op: "insert_placement",
      id: row.id,
      placement_key: pl.placement_key,
      created: true,
    });
  }
  console.log(`  ${n + 1}/${selected.length} ${photo.source_key}`);
}

await writeFile(`${journalFile}.summary.json`, `${JSON.stringify(created, null, 2)}\n`);
console.log(
  `Terminé : ${created.objects} objets, ${created.photos} photos, ${created.variants} variantes, ${created.placements} emplacements créés.`,
);
console.log(`Journal : ${journalFile}`);
