// Import des photos d'un ÉVÉNEMENT (contexte « event ») vers Supabase Storage + tables photos,
// photo_variants, photo_placements, et définition des galeries dans events.galleries.
// Prévu pour les 74 photos de Noël 2026 (docs/photos-storage/manifest-noel-event.json).
//
// SIMULATION PAR DÉFAUT : sans --apply, aucun service n'est contacté, rien n'est écrit (sauf un
// journal prévisionnel hors dépôt).
//
//   0. node scripts/photos-storage/generate-event-variants.mjs --all --write      (variantes locales)
//   1. node scripts/photos-storage/import-event-photos.mjs                       (simulation)
//   2. export SUPABASE_URL=https://<projet>.supabase.co
//      read -rsp 'Clé service_role : ' SUPABASE_SERVICE_ROLE_KEY; echo; export SUPABASE_SERVICE_ROLE_KEY
//      node scripts/photos-storage/import-event-photos.mjs --apply --confirm <projet>.supabase.co --limit 4
//   3. node scripts/photos-storage/import-event-photos.mjs --apply --confirm <projet>.supabase.co
//   4. node scripts/photos-storage/import-event-photos.mjs --publish-existing --apply --confirm <projet>.supabase.co
//   5. retour arrière : node scripts/photos-storage/import-event-photos.mjs --rollback --journal <fichier.jsonl> [--apply --confirm <hôte>]
//
// Sécurité : n'écrase jamais un objet (upsert: false) ; saute ce qui existe déjà et concorde
// (reprise possible) ; refuse une divergence ; photos et emplacements importés en BROUILLON
// (published=false) et sans catégorie ; ne lit aucun fichier .env ; journalise chaque création.
// Le retour arrière ne supprime que ce que le journal marque « created: true » et remet
// events.galleries comme avant.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, VARIANTS_DIR, sha256 } from "./lib.mjs";
import {
  buildEventImportPlan,
  EVENT_PHOTO_DEFAULTS,
  mergeGalleryDefs,
} from "./event-import-plan.mjs";
import { findIncompletePlacement } from "./import-plan.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const apply = flag("--apply");
const publishExisting = flag("--publish-existing");
const rollback = flag("--rollback");
const limit = option("--limit") ? Number(option("--limit")) : undefined;
const only = option("--only")?.split(",").filter(Boolean);
if (option("--limit") && (!Number.isSafeInteger(limit) || limit < 1))
  throw new Error("--limit doit être un entier positif.");
if (rollback && (publishExisting || limit || only))
  throw new Error("--rollback se lance seul (avec --journal).");

const BUCKET = "photos";
const manifest = JSON.parse(
  await readFile(path.join(ROOT, "docs/photos-storage/manifest-noel-event.json"), "utf8"),
);
const plan = buildEventImportPlan(manifest, { limit, only });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const journalDir = path.join(VARIANTS_DIR, "journals");
const journalFile = path.join(
  journalDir,
  `${rollback ? "rollback-" : ""}${apply ? "event-import" : "dry-run-event"}-${stamp}.jsonl`,
);
const journal = async (entry) => {
  await mkdir(journalDir, { recursive: true });
  await appendFile(journalFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

function connect() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être exportées dans le shell.",
    );
  const host = new URL(url).host;
  if (option("--confirm") !== host)
    throw new Error(`Confirmation requise : ajoutez --confirm ${host} (projet visé : ${host}).`);
  return import("@supabase/supabase-js").then(({ createClient }) => ({
    db: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    url,
  }));
}
const must = (result, what) => {
  if (result.error) throw new Error(`${what} : ${result.error.message}`);
  return result.data;
};
const chunks = (list, size = 100) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  );

// ---- Retour arrière -------------------------------------------------------------------------
if (rollback) {
  const file = option("--journal");
  if (!file) throw new Error("--journal <fichier.jsonl> est requis avec --rollback.");
  const entries = (await readFile(file, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  if (entries.some((e) => e.planned))
    throw new Error("Ce journal est une simulation : rien à annuler.");
  const made = entries.filter((e) => e.created === true);
  const by = (op) => made.filter((e) => e.op === op);
  const todo = {
    unpublishPlacements: entries
      .filter((e) => e.op === "publish_placement")
      .map((e) => e.placement_key),
    unpublishPhotos: entries.filter((e) => e.op === "publish_photo").map((e) => e.source_key),
    placements: by("insert_placement").map((e) => e.id),
    variants: by("insert_variant").map((e) => e.id),
    photos: by("insert_photo").map((e) => e.id),
    objects: by("upload").map((e) => e.path),
    galleries: entries.filter((e) => e.op === "set_event_galleries"),
  };
  console.log(apply ? "MODE RÉEL (retour arrière)" : "SIMULATION (retour arrière)");
  console.log(
    `À annuler : ${todo.unpublishPlacements.length} placements et ${todo.unpublishPhotos.length} photos publiés ; à supprimer : ${todo.placements.length} emplacements, ${todo.variants.length} variantes, ${todo.photos.length} photos, ${todo.objects.length} objets ; galeries d'événement à restaurer : ${todo.galleries.length}`,
  );
  if (!apply) {
    console.log("Rien n'a été modifié (ajouter --apply --confirm <hôte>).");
    process.exit(0);
  }
  const { db } = await connect();
  const now = new Date().toISOString();
  for (const keys of chunks(todo.unpublishPlacements))
    must(
      await db
        .from("photo_placements")
        .update({ published: false, updated_at: now })
        .in("placement_key", keys),
      "dépublication des emplacements",
    );
  for (const keys of chunks(todo.unpublishPhotos))
    must(
      await db
        .from("photos")
        .update({ published: false, updated_at: now })
        .in("source_key", keys)
        .is("category_id", null),
      "dépublication des photos",
    );
  for (const ids of chunks(todo.placements))
    must(await db.from("photo_placements").delete().in("id", ids), "emplacements");
  for (const ids of chunks(todo.variants))
    must(await db.from("photo_variants").delete().in("id", ids), "variantes");
  for (const ids of chunks(todo.photos))
    must(await db.from("photos").delete().in("id", ids), "photos");
  for (const paths of chunks(todo.objects, 50))
    must(await db.storage.from(BUCKET).remove(paths), "objets Storage");
  for (const g of todo.galleries.reverse())
    must(
      await db.from("events").update({ galleries: g.previous }).eq("id", g.event_id),
      "restauration des galeries",
    );
  console.log("Retour arrière terminé.");
  process.exit(0);
}

// ---- Simulation ------------------------------------------------------------------------------
const indexPath = path.join(VARIANTS_DIR, "noel-event", "variants-index.json");
let variants = null;
try {
  variants = JSON.parse(await readFile(indexPath, "utf8")).variants;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const ownVariants = (photo) => (variants ?? []).filter((v) => v.source_key === photo.source_key);

console.log(apply ? "MODE RÉEL" : "SIMULATION (aucun service contacté)");
console.log(`Événement : ${plan.eventSlug}`);
console.log(
  `Photos : ${plan.photos.length} ; emplacements : ${plan.placements.length} ; variantes attendues : ${plan.variantCount}`,
);
for (const g of plan.perGallery) console.log(`  ${g.slot} « ${g.title} » : ${g.count} photos`);
console.log(
  "Brouillon : photos published=false, category_id=NULL ; emplacements published=false ; events.galleries complété sans toucher aux galeries existantes.",
);
if (!variants)
  console.log(
    `Variantes locales absentes (${indexPath}) : lancer generate-event-variants.mjs --all --write avant --apply.`,
  );
if (!apply && !publishExisting) {
  await journal({
    planned: true,
    op: "plan",
    photos: plan.photos.length,
    placements: plan.placements.length,
  });
  console.log(`Journal prévisionnel : ${journalFile}`);
  process.exit(0);
}

// ---- Réel -------------------------------------------------------------------------------------
const { db, url } = await connect();
const publicUrl = (p) => db.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

const event = must(
  await db.from("events").select("id, slug, galleries").eq("slug", plan.eventSlug).maybeSingle(),
  "lecture de l'événement",
);
if (!event) throw new Error(`Événement introuvable : ${plan.eventSlug}`);

if (publishExisting) {
  const photoByKey = new Map();
  for (const keys of chunks(plan.photos.map((p) => p.source_key))) {
    for (const row of must(
      await db
        .from("photos")
        .select("id, source_key, category_id, published, on_home, on_portfolio")
        .in("source_key", keys),
      "lecture des photos",
    ))
      photoByKey.set(row.source_key, row);
  }
  for (const photo of plan.photos) {
    const row = photoByKey.get(photo.source_key);
    if (!row) throw new Error(`Photo non importée : ${photo.source_key}`);
    if (row.category_id !== null || row.on_home || row.on_portfolio)
      throw new Error(`Refus de publication : ${photo.source_key} a une exposition legacy`);
  }
  console.log(
    `PUBLICATION : ${plan.photos.length} photos et ${plan.placements.length} emplacements de « ${plan.eventSlug} ».`,
  );
  for (const rows of chunks([...photoByKey.values()].filter((r) => !r.published))) {
    const done = must(
      await db
        .from("photos")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in(
          "source_key",
          rows.map((r) => r.source_key),
        )
        .eq("published", false)
        .is("category_id", null)
        .select("id, source_key"),
      "publication des photos",
    );
    for (const r of done) {
      photoByKey.get(r.source_key).published = true;
      await journal({
        op: "publish_photo",
        id: r.id,
        source_key: r.source_key,
        previous_published: false,
        created: true,
      });
    }
  }
  const placementByKey = new Map();
  for (const keys of chunks(plan.placements.map((p) => p.placement_key)))
    for (const row of must(
      await db
        .from("photo_placements")
        .select("id, placement_key, photo_id, published")
        .in("placement_key", keys),
      "lecture des emplacements",
    ))
      placementByKey.set(row.placement_key, row);
  const incomplete = findIncompletePlacement(plan.placements, placementByKey, photoByKey);
  if (incomplete) throw new Error(`Emplacement incomplet ou photo non publiée : ${incomplete}`);
  for (const rows of chunks([...placementByKey.values()].filter((r) => !r.published))) {
    const done = must(
      await db
        .from("photo_placements")
        .update({ published: true, updated_at: new Date().toISOString() })
        .in(
          "placement_key",
          rows.map((r) => r.placement_key),
        )
        .eq("published", false)
        .select("id, placement_key"),
      "publication des emplacements",
    );
    for (const r of done)
      await journal({
        op: "publish_placement",
        id: r.id,
        placement_key: r.placement_key,
        previous_published: false,
        created: true,
      });
  }
  console.log(`Publié. Journal : ${journalFile}`);
  process.exit(0);
}

if (!variants)
  throw new Error("Variantes locales absentes : lancer generate-event-variants.mjs --all --write.");
for (const photo of plan.photos) {
  if (ownVariants(photo).length === 0)
    throw new Error(`Aucune variante locale pour ${photo.source_key}`);
}
const created = { objects: 0, photos: 0, variants: 0, placements: 0 };

for (const [n, photo] of plan.photos.entries()) {
  const own = ownVariants(photo);
  for (const v of own) {
    const bytes = await readFile(path.join(VARIANTS_DIR, v.file));
    if (bytes.length !== v.byte_size || sha256(bytes) !== v.sha256)
      throw new Error(`Fichier local altéré : ${v.file}`);
    const { error } = await db.storage
      .from(BUCKET)
      .upload(v.storage_path, bytes, {
        contentType: `image/${v.format}`,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      if (!/already exists|Duplicate|409/i.test(`${error.message} ${error.statusCode ?? ""}`))
        throw new Error(`Envoi ${v.storage_path} : ${error.message}`);
      const { data: existing, error: downloadError } = await db.storage
        .from(BUCKET)
        .download(v.storage_path);
      if (downloadError || !existing)
        throw new Error(`Objet présent mais illisible : ${v.storage_path}`);
      const existingBytes = Buffer.from(await existing.arrayBuffer());
      if (existingBytes.length !== v.byte_size || sha256(existingBytes) !== v.sha256)
        throw new Error(
          `Objet déjà présent avec un contenu différent ; aucun écrasement : ${v.storage_path}`,
        );
      await journal({ op: "upload", path: v.storage_path, created: false, verified: true });
      continue;
    }
    created.objects += 1;
    await journal({ op: "upload", path: v.storage_path, created: true });
  }

  let photoRow = must(
    await db
      .from("photos")
      .select("id, category_id, alt_text, image_url, published, on_home, on_portfolio")
      .eq("source_key", photo.source_key)
      .maybeSingle(),
    "lecture photo",
  );
  const largest = own
    .filter((v) => v.format === "webp")
    .reduce((a, b) => (b.width > a.width ? b : a));
  const imageUrl = publicUrl(largest.storage_path);
  if (!photoRow) {
    photoRow = must(
      await db
        .from("photos")
        .insert({
          image_url: imageUrl,
          alt_text: photo.alt_text,
          ...EVENT_PHOTO_DEFAULTS,
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
  } else if (
    photoRow.category_id !== null ||
    photoRow.on_home ||
    photoRow.on_portfolio ||
    photoRow.alt_text !== photo.alt_text ||
    photoRow.image_url !== imageUrl
  ) {
    throw new Error(`Photo déjà présente avec des données divergentes : ${photo.source_key}`);
  }

  for (const v of own) {
    const exists = must(
      await db
        .from("photo_variants")
        .select("id, photo_id, format, width, height, byte_size, sha256")
        .eq("storage_path", v.storage_path)
        .maybeSingle(),
      "lecture variante",
    );
    if (exists) {
      if (
        exists.photo_id !== photoRow.id ||
        exists.sha256 !== v.sha256 ||
        exists.byte_size !== v.byte_size
      )
        throw new Error(`Variante déjà présente avec des données divergentes : ${v.storage_path}`);
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

  for (const pl of plan.placements.filter((p) => p.source_key === photo.source_key)) {
    const exists = must(
      await db
        .from("photo_placements")
        .select("id, photo_id, event_id, slot, display_order, published")
        .eq("placement_key", pl.placement_key)
        .maybeSingle(),
      "lecture emplacement",
    );
    if (exists) {
      if (
        exists.photo_id !== photoRow.id ||
        exists.event_id !== event.id ||
        exists.slot !== pl.slot ||
        exists.display_order !== pl.display_order
      )
        throw new Error(
          `Emplacement déjà présent avec des données divergentes : ${pl.placement_key}`,
        );
      continue;
    }
    const row = must(
      await db
        .from("photo_placements")
        .insert({
          placement_key: pl.placement_key,
          photo_id: photoRow.id,
          context_type: "event",
          event_id: event.id,
          slot: pl.slot,
          display_order: pl.display_order,
          object_position_x_pct: pl.object_position_x_pct,
          object_position_y_pct: pl.object_position_y_pct,
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
  console.log(`  ${n + 1}/${plan.photos.length} ${photo.source_key}`);
}

// Galeries de l'événement : on complète sans retirer ni renommer celles qui existent.
const next = mergeGalleryDefs(event.galleries, plan.galleries);
if (JSON.stringify(next) !== JSON.stringify(event.galleries ?? [])) {
  must(
    await db.from("events").update({ galleries: next }).eq("id", event.id),
    "mise à jour des galeries de l'événement",
  );
  await journal({
    op: "set_event_galleries",
    event_id: event.id,
    previous: event.galleries ?? [],
    next,
    created: true,
  });
  console.log(`Galeries de l'événement : ${next.map((g) => g.title).join(", ")}`);
}
console.log(
  `Terminé : ${created.objects} objets, ${created.photos} photos, ${created.variants} variantes, ${created.placements} emplacements créés (hôte ${new URL(url).host}).`,
);
console.log(`Journal : ${journalFile}`);
