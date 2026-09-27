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
// Options : --profile q55 | --limit N | --only cle1,cle2 | --plan-only | --preflight
// | --publish-existing (publication distincte des photos et placements déjà importés).
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { VARIANTS_DIR, readManifest, sha256 } from "./lib.mjs";
import { buildImportPlan, IMPORT_PHOTO_DEFAULTS, selectImportPhotos } from "./import-plan.mjs";
import { expectedVariantCount, expectedWidthsFor, GENERATION_VERSION, getQualityProfile } from "./quality-profiles.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const apply = flag("--apply");
const preflightOnly = flag("--preflight");
const planOnly = flag("--plan-only");
if (flag("--publish")) {
  throw new Error("--publish est supprimé : l'import est toujours en brouillon; utiliser --publish-existing plus tard.");
}
const publishExisting = flag("--publish-existing");
const profileName = option("--profile");
const limit = option("--limit") ? Number(option("--limit")) : undefined;
const only = option("--only")?.split(",").filter(Boolean);
const BUCKET = "photos";
if (option("--limit") && (!Number.isSafeInteger(limit) || limit < 1)) {
  throw new Error("--limit doit être un entier positif.");
}
if (preflightOnly && (apply || limit || only?.length || publishExisting || planOnly)) {
  throw new Error("--preflight se lance seul, sans limite, publication ni écriture.");
}
if (planOnly && (apply || preflightOnly || publishExisting)) {
  throw new Error("--plan-only se lance sans écriture, import réel ou publication.");
}
if (profileName) getQualityProfile(profileName);
if (planOnly && !profileName) throw new Error("--plan-only exige --profile q55.");

const manifest = await readManifest();
if (manifest.version !== 3 || manifest.variant_formats?.join(",") !== "avif,webp" ||
    manifest.target_widths?.join(",") !== "400,800,1200,1600") {
  throw new Error("Le manifeste doit prévoir AVIF/WebP aux tailles 400/800/1200/1600.");
}
if (planOnly) {
  const plan = buildImportPlan(manifest, { limit, only });
  console.log(`PLAN SEUL — profil ${profileName}; aucune variante lue, aucune écriture ou journal.`);
  console.log(`Photos : ${plan.photoCount}/${manifest.photos.length}; variantes prévues : ${plan.variantCount}.`);
  console.log(`Par largeur : ${Object.entries(plan.variantCountsByWidth).map(([width, count]) => `${width}=${count}`).join(", ")}.`);
  console.log(`Emplacements : ${plan.placementCount}; photos insérées published=false, category_id=NULL, on_home=false, on_portfolio=false; placements published=false.`);
  console.log("Poids exact indisponible tant que les variantes de ce profil n'ont pas été générées et vérifiées.");
  process.exit(0);
}
const index = JSON.parse(
  await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"),
);
const { variants } = index;
if (index.version !== GENERATION_VERSION || index.target_widths?.join(",") !== manifest.target_widths.join(",")) {
  throw new Error("Variantes obsolètes : génération v4 requise avec les quatre tailles.");
}
const indexProfile = getQualityProfile(index.encoder_settings?.quality_profile);
if (profileName && indexProfile.name !== profileName) {
  throw new Error(`L'index est encodé en ${indexProfile.name}, pas avec le profil demandé ${profileName}.`);
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
  const expected = expectedWidthsFor(photo.width, manifest.target_widths).length * manifest.variant_formats.length;
  if (own.length !== expected || own.some((v) => !["avif", "webp"].includes(v.format))) {
    throw new Error(`Variantes incomplètes pour ${photo.source_key} : exécuter verify-variants.mjs.`);
  }
}
if (preflightOnly) {
  const blockers = [];
  const photoKeys = new Set(manifest.photos.map((photo) => photo.source_key));
  if (photoKeys.size !== manifest.photos.length) blockers.push("source_key en double dans le manifeste");
  if (manifest.photos.length !== 170) blockers.push(`170 photos attendues, ${manifest.photos.length} trouvées`);
  const expectedVariants = expectedVariantCount(manifest.photos, manifest.target_widths, manifest.variant_formats);
  if (variants.length !== expectedVariants) blockers.push(`${expectedVariants} variantes attendues, ${variants.length} trouvées`);
  if (manifest.placements.length !== 190) blockers.push(`190 emplacements attendus, ${manifest.placements.length} trouvés`);
  for (const photo of manifest.photos) {
    if (photo.source_key !== `galleries/${photo.category}/${photo.source_sha256?.slice(0, 12)}`) {
      blockers.push(`${photo.source_key}: clé source non dérivée de l'empreinte attendue`);
    }
    if (!photo.alt_text?.trim()) blockers.push(`${photo.source_key}: texte alternatif photo manquant`);
    const own = variantsBySource.get(photo.source_key) ?? [];
    for (const width of expectedWidthsFor(photo.width, manifest.target_widths)) {
      for (const format of ["avif", "webp"]) {
        const matches = own.filter((variant) => variant.width === width && variant.format === format);
        if (matches.length !== 1) blockers.push(`${photo.source_key}: ${matches.length} variante(s) ${width}px ${format}, une attendue`);
      }
    }
  }
  if (variants.some((variant) => !photoKeys.has(variant.source_key))) blockers.push("variante avec source_key absente du manifeste");
  const placementKeys = new Set();
  for (const placement of manifest.placements) {
    if (placementKeys.has(placement.placement_key)) blockers.push(`placement_key en double: ${placement.placement_key}`);
    placementKeys.add(placement.placement_key);
    if (!photoKeys.has(placement.source_key)) blockers.push(`${placement.placement_key}: référence source absente`);
    const photo = manifest.photos.find((candidate) => candidate.source_key === placement.source_key);
    if (!placement.alt?.trim() || !placement.alt.startsWith(photo?.alt_text ?? "")) {
      blockers.push(`${placement.placement_key}: texte alternatif absent ou incohérent`);
    }
  }
  const bytes = variants.reduce((sum, variant) => sum + variant.byte_size, 0);
  const formats = Object.fromEntries(["avif", "webp"].map((format) => [
    format,
    variants.filter((variant) => variant.format === format).length,
  ]));
  console.log(blockers.length ? "NOT READY — blocages manifeste/import :" : "READY — manifeste et plan d'import locaux :");
  for (const blocker of blockers) console.log(`- ${blocker}`);
  console.log(`Photos: ${manifest.photos.length}; variantes: ${variants.length} (${formats.avif} AVIF, ${formats.webp} WebP); emplacements: ${manifest.placements.length}; poids indexé: ${(bytes / 1e6).toFixed(2)} Mo.`);
  if (blockers.length) process.exit(1);
  console.log("Aucun journal n'est créé ; les octets doivent aussi passer verify-variants.mjs.");
  process.exit(0);
}

const selected = selectImportPhotos(manifest, { limit, only });
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
console.log(`Profil qualité : ${indexProfile.name}`);
console.log(`Photos sélectionnées : ${selected.length} / ${manifest.photos.length}`);
console.log(
  `Variantes à envoyer   : ${plannedUploads.length} (${mb(plannedUploads.reduce((s, v) => s + v.byte_size, 0))})`,
);
console.log(`Emplacements          : ${selectedPlacements.length} (photos published = false, category_id = NULL; placements published = false)`);

// ---------- Simulation ----------
if (!apply) {
  if (publishExisting) {
    console.log(`\n[simulation] publier les photos et emplacements déjà importés de ${selected.length} photo(s) :`);
    console.log(`  UPDATE photos SET published=true, category_id=NULL WHERE source_key IN (${selected.length} clés)`);
    console.log(`  UPDATE photo_placements SET published=true WHERE placement_key IN (${selectedPlacements.length} clés)`);
    console.log("Aucun fichier n'a été envoyé; aucune ligne n'a été modifiée.");
    process.exit(0);
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
      `  INSERT  photos            source_key=${photo.source_key} category_id=NULL published=false on_home=false on_portfolio=false alt="${photo.alt_text}"`,
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
  const photoByKey = new Map();
  const sourceKeys = selected.map((photo) => photo.source_key);
  for (let i = 0; i < sourceKeys.length; i += 100) {
    const chunk = sourceKeys.slice(i, i + 100);
    const rows = must(
      await db.from("photos").select("id, source_key, category_id, published, on_home, on_portfolio").in("source_key", chunk),
      "lecture des photos brouillon",
    );
    for (const row of rows) photoByKey.set(row.source_key, row);
  }
  for (const photo of selected) {
    const row = photoByKey.get(photo.source_key);
    if (!row) throw new Error(`Photo non importée : ${photo.source_key}`);
    if (row.category_id !== null || row.on_home !== false || row.on_portfolio !== false) {
      throw new Error(`Refus de publication : ${photo.source_key} a une exposition legacy`);
    }
  }
  const unpublishedPhotos = [...photoByKey.values()].filter((row) => !row.published);
  for (let i = 0; i < unpublishedPhotos.length; i += 100) {
    const chunk = unpublishedPhotos.slice(i, i + 100);
    const rows = must(
      await db.from("photos")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in("source_key", chunk.map((row) => row.source_key))
        .eq("published", false)
        .is("category_id", null)
        .select("id, source_key"),
      "publication des photos importées",
    );
    for (const row of rows) {
      await journal({ op: "publish_photo", id: row.id, source_key: row.source_key, previous_published: false, created: true });
    }
  }

  const placementByKey = new Map();
  const placementKeys = selectedPlacements.map((placement) => placement.placement_key);
  for (let i = 0; i < placementKeys.length; i += 100) {
    const chunk = placementKeys.slice(i, i + 100);
    const rows = must(
      await db.from("photo_placements")
        .select("id, placement_key, photo_id, published")
        .in("placement_key", chunk),
      "lecture des emplacements brouillon",
    );
    for (const row of rows) placementByKey.set(row.placement_key, row);
  }
  for (const placement of selectedPlacements) {
    const row = placementByKey.get(placement.placement_key);
    const photo = photoByKey.get(placement.source_key);
    if (!row || row.photo_id !== photo?.id || !photo.published) {
      throw new Error(`Emplacement incomplet ou photo non publiée : ${placement.placement_key}`);
    }
  }
  const unpublishedPlacements = [...placementByKey.values()].filter((row) => !row.published);
  for (let i = 0; i < unpublishedPlacements.length; i += 100) {
    const chunk = unpublishedPlacements.slice(i, i + 100);
    const rows = must(
      await db.from("photo_placements")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in("placement_key", chunk.map((row) => row.placement_key))
        .eq("published", false)
        .select("id, placement_key"),
      "publication des emplacements",
    );
    for (const row of rows) {
      await journal({ op: "publish_placement", id: row.id, placement_key: row.placement_key, previous_published: false, created: true });
    }
  }
  console.log(`Photos et emplacements publiés pour ${selected.length} photo(s); category_id reste NULL.`);
  process.exit(0);
}

const seoPages = new Map(
  must(await db.from("seo_pages").select("id, slug"), "pages SEO").map((s) => [s.slug, s.id]),
);
const publicUrl = (p) => db.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

let created = { objects: 0, photos: 0, variants: 0, placements: 0 };
for (const [n, photo] of selected.entries()) {
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
    await db.from("photos").select("id, category_id, alt_text, image_url, published, on_home, on_portfolio").eq("source_key", photo.source_key).maybeSingle(),
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
          ...IMPORT_PHOTO_DEFAULTS,
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
    if (photoRow.category_id !== null || photoRow.published !== false || photoRow.on_home !== false || photoRow.on_portfolio !== false ||
        photoRow.alt_text !== photo.alt_text || photoRow.image_url !== expectedImageUrl) {
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
          exists.published !== false) {
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
          published: false,
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
