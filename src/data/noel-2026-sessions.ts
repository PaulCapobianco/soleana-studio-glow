import type { NoelGalleryPhoto } from "@/data/noel-2026";

// Photos par séance, dans l'ordre de prise de vue (EXIF). La couverture s'affiche sur la tuile
// et passe en premier dans la lightbox ; les autres photos suivent dans l'ordre chronologique.
// Les fichiers (700w pour la grille, 1600w pour l'agrandissement) sont dans assets/noel-2026.
const files = import.meta.glob(
  ["../assets/noel-2026/noel-s0*.webp", "../assets/noel-2026/noel-decor-*.webp"],
  { eager: true, import: "default" },
) as Record<string, string>;

const url = (name: string) => files[`../assets/noel-2026/${name}.webp`];

// [hauteur à 700 px de large, description] dans l'ordre chronologique.
type RawPhoto = [number, string];

export type NoelSession = {
  id: string;
  /** Photo de couverture (aussi la première de la lightbox). */
  cover: NoelGalleryPhoto;
  /** Toutes les photos de la séance, couverture en tête puis ordre chronologique. */
  photos: NoelGalleryPhoto[];
};

function buildSession(
  id: string,
  prefix: string,
  coverNumber: number,
  raw: RawPhoto[],
): NoelSession {
  const all = raw.map(([height, alt], index): NoelGalleryPhoto => {
    const name = `${prefix}-${String(index + 1).padStart(2, "0")}`;
    return { id: name, src: url(name), srcLarge: url(`${name}-1600`), width: 700, height, alt };
  });
  const cover = all[coverNumber - 1];
  return { id, cover, photos: [cover, ...all.filter((photo) => photo !== cover)] };
}

const RAW_S01: RawPhoto[] = [
  [
    467,
    "Famille de quatre assise sur un plaid au milieu des sapins, tenant un panneau lumineux de vœux",
  ],
  [467, "Famille riant ensemble sur le plaid, un panneau lumineux de vœux devant eux"],
  [467, "Deux adultes s'embrassent au centre de la famille, deux jeunes filles rient autour d'eux"],
  [467, "Famille serrée sur le plaid, panneau lumineux devant eux, cadeaux et traîneau derrière"],
  [
    467,
    "Portrait de famille tout en douceur devant un sapin, les enfants blottis contre leurs parents",
  ],
  [
    467,
    "Deux adultes assis côte à côte sur le plaid, sourires complices, étoile en papier en arrière-plan",
  ],
  [467, "Deux jeunes filles assises côte à côte sur le plaid, coussins rouges et étoile dorée"],
  [467, "Deux jeunes filles enlacées sur le plaid, complices, sapins et cadeaux derrière"],
  [
    467,
    "Portrait de famille en lumière d'automne, quatre visages souriants serrés les uns contre les autres",
  ],
  [467, "Famille assise sur le plaid, une jeune fille entre les adultes, décor de Noël"],
  [467, "Un homme et une femme embrassent une jeune fille sur les joues, étoile en papier au fond"],
  [467, "Famille réunie sur le plaid autour d'un panneau lumineux de vœux"],
  [
    1050,
    "Deux jeunes filles blotties l'une contre l'autre, regard vers l'objectif, étoile en papier au-dessus",
  ],
];

const RAW_S02: RawPhoto[] = [
  [
    1050,
    "Couple assis sur un plaid au pied d'un sapin, tendrement enlacé, étoile rouge en arrière-plan",
  ],
  [467, "Couple enlacé au pied d'un sapin, cadeaux et étoile rouge derrière eux"],
  [467, "Couple dans le décor de Noël, elle l'embrasse sur la joue, coussins et étoile lumineuse"],
  [
    467,
    "Couple enlacé sur le plaid, elle l'entoure de ses bras, étoile en papier et coussins de Noël",
  ],
  [1050, "Couple souriant face à l'objectif sur le plaid, guirlande lumineuse et lumières floues"],
  [1050, "Couple qui s'embrasse, lumières de guirlande floues au premier plan"],
  [1050, "Couple assis sur le plaid, front contre front, lumières de guirlande"],
  [1050, "Couple debout devant un sapin, tendre étreinte, lumières dorées floues"],
  [1050, "Baiser sur la joue et sourires, guirlande lumineuse autour du couple"],
  [1050, "Couple qui s'embrasse devant les sapins, lumières floues"],
  [1050, "Couple front contre front à l'heure bleue, guirlandes et lumières dorées"],
];

const RAW_S03: RawPhoto[] = [
  [1050, "Couple face à face au milieu des sapins en lumière dorée, un moment d'émotion"],
  [1050, "Étreinte joyeuse d'un couple en contre-jour doré devant un sapin"],
  [1050, "Couple qui s'enlace avec émotion, lumière dorée de fin de journée"],
  [1050, "Une femme sourit en tendant la main vers son compagnon, dans le décor de Noël"],
  [1050, "Étreinte pleine de joie d'un couple, sourire en lumière dorée"],
  [467, "Couple assis sur le plaid, elle l'embrasse sur la joue, étoile en papier derrière"],
  [1050, "Couple assis sur le plaid en lumière dorée, front contre front"],
  [467, "Couple enlacé serrant des coussins de Noël, complices"],
  [1050, "Couple assis sur le plaid, tendre étreinte au milieu des coussins"],
  [1050, "Couple enlacé sur le plaid, baiser sur le front, étoile en papier"],
  [1050, "Couple blotti l'un contre l'autre sur le plaid, coussins rouges"],
  [467, "Une femme serre un coussin de Noël dans ses bras, son compagnon derrière elle"],
  [1050, "Couple allongé sur le plaid, tendre complicité, coussins et cadeaux"],
  [467, "Couple enlacé sur le plaid devant une étoile en papier, baiser sur le front"],
  [1050, "Baiser sur le front, guirlande lumineuse sur le pull, ciel clair"],
  [1050, "Étreinte de couple contre le ciel du soir, guirlande lumineuse"],
  [1050, "Couple installé sur le plaid au loin, décor de Noël en pleine nature"],
  [1050, "Couple qui s'embrasse sur le plaid, lumière chaude de fin de journée"],
  [1050, "Deux mains enlacées avec une bague, plaid à carreaux flou en arrière-plan"],
];

const RAW_S04: RawPhoto[] = [
  [1050, "Couple debout face à face, souriant, au milieu des sapins à la tombée du jour"],
  [467, "Couple enlacé devant un sapin, étoile rouge et décor de Noël"],
  [1050, "Couple debout qui se tient par la main, sourires, sapins derrière"],
  [1050, "Couple assis sur le plaid, elle l'embrasse sur la joue en riant"],
  [1050, "Couple assis sur le plaid, rires complices et regards"],
  [1050, "Couple assis sur le plaid, échange de regards, cadeaux et étoile"],
  [467, "Couple assis sur le plaid devant un décor de Noël, elle l'entoure de ses bras"],
  [1050, "Un homme soulève sa compagne dans ses bras, regards complices, sapins derrière"],
  [467, "Couple souriant, blotti l'un contre l'autre devant un sapin"],
  [1050, "Couple souriant, main sur l'épaule, tendresse au milieu des sapins"],
  [1050, "Couple assis, regards tournés l'un vers l'autre, cadeaux et étoile rouge"],
  [1050, "Portrait rapproché d'un couple souriant, écharpe blanche, lumières de guirlande floues"],
];

const RAW_DECOR: RawPhoto[] = [
  [
    1050,
    "Décor de Noël au milieu des sapins : plaid, coussins, étoile en papier et traîneau, en lumière du jour",
  ],
  [467, "Décor de Noël sur un plaid à carreaux, coussins, étoile en papier et cadeaux, vue large"],
  [1050, "Coussins, étoile en papier et cadeaux posés sur le plaid, vue rapprochée"],
  [1050, "Cadeau, coussin rouge et étoile dorée devant un sapin, étoile rouge suspendue"],
  [1050, "Plaid, coussin rouge et étoile lumineuse devant un sapin, en lumière du jour"],
  [467, "Décor de Noël sous les sapins, vue d'ensemble"],
  [
    1050,
    "Cadeaux entourés de guirlandes lumineuses et de lumières dorées floues à la tombée du jour",
  ],
  [1050, "Cadeaux et guirlande lumineuse sur le traîneau, ambiance de soirée"],
  [467, "Guirlande lumineuse floue, points dorés sur un plaid à carreaux"],
  [467, "Plaid, coussins et cadeaux éclairés par les guirlandes, lumières dorées floues"],
  [1050, "Traîneau, cadeaux et guirlandes lumineuses sur un plaid, au crépuscule"],
  [1050, "Étoile rouge, coussins, plaid et cadeaux éclairés par une guirlande, à l'heure bleue"],
  [1050, "Décor de Noël éclairé de guirlandes, lumières dorées floues sur le plaid"],
  [1050, "Décor de Noël illuminé, coussins, étoile rouge et lumières floues"],
  [1050, "Étoile de papier suspendue à un sapin au-dessus des cadeaux et de l'étoile lumineuse"],
  [1050, "Étoile rouge, coussin de Noël et plaid à carreaux dans la lumière du soir"],
  [1050, "Cadeau enveloppé de guirlandes lumineuses, gros plan flou à l'heure bleue"],
  [1050, "Cadeaux ornés de rubans rouges et de guirlandes lumineuses, gros plan"],
  [1050, "Étoile de papier suspendue au-dessus des cadeaux et du traîneau, ciel du soir"],
];

// Ordre d'affichage : famille, puis trois séances de couple, puis le décor.
export const NOEL_2026_SESSIONS: NoelSession[] = [
  buildSession("famille", "noel-s01", 9, RAW_S01),
  buildSession("couple-a", "noel-s02", 5, RAW_S02),
  buildSession("couple-b", "noel-s03", 5, RAW_S03),
  buildSession("couple-c", "noel-s04", 12, RAW_S04),
  buildSession("decor", "noel-decor", 12, RAW_DECOR),
];
