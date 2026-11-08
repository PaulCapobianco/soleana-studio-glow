// Identifiants d'icônes acceptés pour un événement. Source unique côté code ; la migration
// 20261108000000_add_event_appearance.sql en reprend la liste dans ses CHECK (un test vérifie
// que les deux restent identiques). Les tracés sont dans icon-data.ts (généré), les libellés
// français dans icon-labels.ts (admin seulement).

/** Étoile dessinée à la main (voir NoelStar) : l'icône principale actuelle de Noël. */
export const DEFAULT_MAIN_ICON = "etoile-noel";
/** Pas d'icône : les puces gardent leur apparence d'origine (simples filets). */
export const DEFAULT_BULLET_ICON = "defaut";

export const LUCIDE_ICON_IDS = [
  "star",
  "sparkles",
  "snowflake",
  "tree-pine",
  "gift",
  "heart",
  "hand-heart",
  "camera",
  "calendar",
  "calendar-days",
  "map-pin",
  "clock",
  "sun",
  "moon",
  "cloud-sun",
  "umbrella",
  "flower-2",
  "leaf",
  "sprout",
  "trees",
  "mountain",
  "baby",
  "users",
  "smile",
  "music",
  "bell",
  "candy-cane",
  "cake",
  "party-popper",
  "wine",
  "coffee",
  "flame",
  "gem",
  "crown",
  "ribbon",
  "bird",
  "check",
] as const;

export const MAIN_ICON_IDS: readonly string[] = [DEFAULT_MAIN_ICON, ...LUCIDE_ICON_IDS];
export const BULLET_ICON_IDS: readonly string[] = [DEFAULT_BULLET_ICON, ...MAIN_ICON_IDS];

export const isMainIcon = (id: string) => MAIN_ICON_IDS.includes(id);
export const isBulletIcon = (id: string) => BULLET_ICON_IDS.includes(id);
