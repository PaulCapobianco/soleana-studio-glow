// Retour arrière d'un lot d'import : supprime UNIQUEMENT ce que le journal indique comme créé
// (created: true), dans l'ordre inverse : emplacements, variantes, photos, puis objets Storage.
// Ne supprime jamais le bucket ni une ligne préexistante. Simulation par défaut.
//   node scripts/photos-storage/rollback-import.mjs --journal <fichier.jsonl>            (simulation)
//   node scripts/photos-storage/rollback-import.mjs --journal <fichier.jsonl> --apply --confirm <hôte>
import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const option = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
const apply = args.includes("--apply");
const file = option("--journal");
if (!file) throw new Error("--journal <fichier.jsonl> est requis.");

const entries = (await readFile(file, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
if (entries.some((e) => e.planned))
  throw new Error("Ce journal est une simulation : rien à annuler.");
const created = entries.filter((e) => e.created === true);
const by = (op) => created.filter((e) => e.op === op);
const plan = {
  unpublish: entries.filter((e) => e.op === "publish_placement" && e.updated && e.previous_published === false).map((e) => e.placement_key),
  placements: by("insert_placement").map((e) => e.id),
  variants: by("insert_variant").map((e) => e.id),
  photos: by("insert_photo").map((e) => e.id),
  objects: by("upload").map((e) => e.path),
};
console.log(apply ? "MODE RÉEL" : "SIMULATION");
console.log(
  `À annuler : ${plan.unpublish.length} publications ; à supprimer : ${plan.placements.length} emplacements, ${plan.variants.length} variantes, ${plan.photos.length} photos, ${plan.objects.length} objets Storage`,
);
if (!apply) {
  console.log("Rien n'a été supprimé (ajouter --apply --confirm <hôte>).");
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être exportées dans le shell.",
  );
const host = new URL(url).host;
if (option("--confirm") !== host) throw new Error(`Confirmation requise : --confirm ${host}`);
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const must = (r, what) => {
  if (r.error) throw new Error(`${what} : ${r.error.message}`);
};
for (let i = 0; i < plan.unpublish.length; i += 100)
  must(
    await db.from("photo_placements").update({ published: false, updated_at: new Date().toISOString() })
      .in("placement_key", plan.unpublish.slice(i, i + 100)),
    "annulation des publications",
  );
for (let i = 0; i < plan.placements.length; i += 100)
  must(
    await db
      .from("photo_placements")
      .delete()
      .in("id", plan.placements.slice(i, i + 100)),
    "emplacements",
  );
for (let i = 0; i < plan.variants.length; i += 100)
  must(
    await db
      .from("photo_variants")
      .delete()
      .in("id", plan.variants.slice(i, i + 100)),
    "variantes",
  );
for (let i = 0; i < plan.photos.length; i += 100)
  must(
    await db
      .from("photos")
      .delete()
      .in("id", plan.photos.slice(i, i + 100)),
    "photos",
  );
for (let i = 0; i < plan.objects.length; i += 100)
  must(await db.storage.from("photos").remove(plan.objects.slice(i, i + 100)), "objets");
console.log("Retour arrière terminé.");
