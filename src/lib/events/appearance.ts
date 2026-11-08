import { ICON_NODES, type IconNode } from "./icon-data";
import { DEFAULT_BULLET_ICON, DEFAULT_MAIN_ICON } from "./icons";
import { resolveThemeTokens, themeCssVars } from "./theme";

/** Apparence prête à afficher : le serveur n'envoie au navigateur que les deux icônes choisies. */
export type EventAppearance = {
  vars: Record<string, string>;
  /** null = l'étoile de Noël dessinée à la main (NoelStar). */
  iconMain: IconNode | null;
  /** null = puces d'origine (filets), sans icône. */
  iconBullet: IconNode | null;
};

export function buildAppearance(input: {
  theme: string;
  accent_color: string | null;
  icon_main: string;
  icon_bullet: string;
}): EventAppearance {
  return {
    vars: themeCssVars(resolveThemeTokens(input.theme, input.accent_color)),
    iconMain: input.icon_main === DEFAULT_MAIN_ICON ? null : (ICON_NODES[input.icon_main] ?? null),
    iconBullet:
      input.icon_bullet === DEFAULT_BULLET_ICON ? null : (ICON_NODES[input.icon_bullet] ?? null),
  };
}
