// Génère src/lib/events/icon-data.ts à partir de lucide-react (déjà une dépendance du projet) :
// seules les icônes listées ici sont extraites, sous forme de données (pas de composants), pour
// que le serveur n'envoie au navigateur que celles qu'un événement utilise réellement.
// Usage : node scripts/generate-event-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";

// id lucide → libellé (les libellés affichés dans l'admin sont dans src/lib/events/icons.ts ;
// l'icône « etoile-noel » est dessinée à la main, voir NoelStar)
export const ICONS = [
  ["star", "Étoile"],
  ["sparkles", "Étincelles"],
  ["snowflake", "Flocon"],
  ["tree-pine", "Sapin"],
  ["gift", "Cadeau"],
  ["heart", "Cœur"],
  ["hand-heart", "Attention"],
  ["camera", "Appareil photo"],
  ["calendar", "Calendrier"],
  ["calendar-days", "Dates"],
  ["map-pin", "Lieu"],
  ["clock", "Horloge"],
  ["sun", "Soleil"],
  ["moon", "Lune"],
  ["cloud-sun", "Éclaircie"],
  ["umbrella", "Parapluie"],
  ["flower-2", "Fleur"],
  ["leaf", "Feuille"],
  ["sprout", "Pousse"],
  ["trees", "Forêt"],
  ["mountain", "Montagne"],
  ["baby", "Bébé"],
  ["users", "Famille"],
  ["smile", "Sourire"],
  ["music", "Musique"],
  ["bell", "Cloche"],
  ["candy-cane", "Sucre d'orge"],
  ["cake", "Gâteau"],
  ["party-popper", "Fête"],
  ["wine", "Verre"],
  ["coffee", "Boisson chaude"],
  ["flame", "Flamme"],
  ["gem", "Diamant"],
  ["crown", "Couronne"],
  ["ribbon", "Ruban"],
  ["bird", "Oiseau"],
  ["check", "Coche"],
];

const out = [
  "// FICHIER GÉNÉRÉ par scripts/generate-event-icons.mjs — ne pas modifier à la main.",
  "// Tracés des icônes lucide (licence ISC, © Lucide Contributors), réduits aux icônes proposées",
  "// pour les événements.",
  "export type IconNode = [string, Record<string, string>][];",
  "",
  "export const ICON_NODES: Record<string, IconNode> = {",
];
for (const [id] of ICONS) {
  const src = readFileSync(`node_modules/lucide-react/dist/esm/icons/${id}.js`, "utf8");
  const match = /const __iconNode = (\[[\s\S]*?\]);\r?\n/.exec(src);
  if (!match) throw new Error(`icône introuvable : ${id}`);
  const nodes = new Function(`return ${match[1]}`)().map(([tag, { key, ...attrs }]) => [
    tag,
    attrs,
  ]);
  out.push(`  ${JSON.stringify(id)}: ${JSON.stringify(nodes)},`);
}
out.push("};", "");
writeFileSync("src/lib/events/icon-data.ts", out.join("\n"));
console.log(`${ICONS.length} icônes écrites`);
