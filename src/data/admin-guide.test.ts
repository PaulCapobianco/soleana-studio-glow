import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_GUIDE_OTHER_SECTIONS,
  ADMIN_GUIDE_SECTIONS,
  ADMIN_GUIDE_TROUBLESHOOTING,
} from "./admin-guide";

// Le guide cite des libellés entre « guillemets » : chacun doit exister dans l'interface, sinon le
// guide ment (un bouton renommé, une section supprimée). Les exemples écrits par la photographe
// ne sont pas des libellés et sont listés ici.
const EXAMPLES = [
  "Mini-séances de printemps 2027",
  "Édition précédente",
  "Famille",
  "Une famille rit dans un champ de lavande",
  "Reconnectez-vous avec votre code à 6 chiffres pour modifier le site",
  "demande la double authentification",
  "Votre session a expiré",
  "Connexion impossible",
  "édition terminée",
  "En cas de mauvais temps, les séances sont reportées aux…",
  "indiquée deux fois",
  "Impossible de publier",
  "À vérifier avant de publier",
  "Publié",
  "Supprimer ce brouillon", // bouton : présent, vérifié aussi comme libellé
];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

const ui = [
  "src/components/admin",
  "src/routes/admin",
  "src/lib/admin",
  "src/lib/events",
  "src/components/site",
]
  .flatMap((dir) => sources(dir))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n")
  .replace(/&apos;/g, "'")
  .replace(/’/g, "'");

const guideText = [
  ...ADMIN_GUIDE_SECTIONS.flatMap((s) => [
    s.title,
    s.summary,
    ...s.steps,
    s.publicImpact,
    s.commonMistake?.problem ?? "",
    s.commonMistake?.fix ?? "",
  ]),
  ...ADMIN_GUIDE_OTHER_SECTIONS.map((o) => `${o.name} ${o.text}`),
  ...ADMIN_GUIDE_TROUBLESHOOTING.flatMap((t) => [t.question, t.answer]),
].join("\n");

const quoted = [
  ...new Set([...guideText.matchAll(/«\s*([^»]+?)\s*»/g)].map((m) => m[1].replace(/’/g, "'"))),
];

describe("guide d'aide", () => {
  it("cite au moins quelques libellés (le test ne vérifie pas rien)", () => {
    expect(quoted.length).toBeGreaterThan(30);
  });

  it.each(quoted.filter((label) => !EXAMPLES.includes(label)))(
    "le libellé « %s » existe dans l'interface",
    (label) => {
      expect(ui.includes(label)).toBe(true);
    },
  );

  it("chaque rubrique a un identifiant unique, des étapes courtes et un effet sur le site", () => {
    const ids = ADMIN_GUIDE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of ADMIN_GUIDE_SECTIONS) {
      expect(section.steps.length).toBeGreaterThan(0);
      expect(section.publicImpact.length).toBeGreaterThan(10);
      for (const step of section.steps) expect(step.length).toBeLessThan(420);
    }
  });

  it("couvre les sujets demandés à la photographe", () => {
    const text = guideText.toLowerCase();
    for (const topic of [
      "double authentification",
      "créer et publier un événement",
      "dates",
      "édition précédente",
      "cadrage",
      "dupliquer",
      "archiver",
      "paul",
    ])
      expect(text).toContain(topic);
  });
});
