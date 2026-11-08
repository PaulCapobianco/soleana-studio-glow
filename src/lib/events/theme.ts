// Thèmes d'apparence d'un événement. Chaque thème fixe trois couleurs qui pilotent toute la page
// (via les variables CSS de NoelCampaign.module.css) :
//   primary    → texte, boutons et fonds « nuit » (le bordeaux de Noël)
//   accent     → filets, étoile et décors
//   accentText → version claire de l'accent, pour le petit texte posé sur la couleur principale
// Le papier (#faf6ef) et la crème (#fffdf8) restent ceux du site. Le thème par défaut reproduit
// à l'identique l'apparence actuelle de Noël 2026.

export const PAPER = "#faf6ef";
export const CREAM = "#fffdf8";

/** Seuils : texte normal WCAG AA = 4,5 ; éléments graphiques = 3. */
export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_GRAPHIC_CONTRAST = 3;
/** Un accent plus clair que ce seuil vis-à-vis du papier disparaît sur les zones claires. */
export const MIN_ACCENT_ON_PAPER = 1.8;

export type ThemeTokens = { primary: string; accent: string; accentText: string };
export type Theme = ThemeTokens & { id: string; label: string; mood: string };

export const THEMES: readonly Theme[] = [
  {
    id: "noel-classique",
    label: "Noël classique",
    mood: "Bordeaux et or doux",
    primary: "#5E1112",
    accent: "#C6966F",
    accentText: "#E3C4A4",
  },
  {
    id: "sapin",
    label: "Noël sapin",
    mood: "Vert profond et or",
    primary: "#1E4D3B",
    accent: "#C9A24B",
    accentText: "#E6CF94",
  },
  {
    id: "noel-dore",
    label: "Noël doré",
    mood: "Brun chaud et or brillant",
    primary: "#4A3410",
    accent: "#D4AF37",
    accentText: "#F0DC9A",
  },
  {
    id: "hiver",
    label: "Hiver givré",
    mood: "Bleu nuit et bleu glacé",
    primary: "#1F3A5F",
    accent: "#8FB8DE",
    accentText: "#C9DDF0",
  },
  {
    id: "printemps",
    label: "Printemps",
    mood: "Vert tendre et rose",
    primary: "#3F6B4A",
    accent: "#E8A5B5",
    accentText: "#F9DEE4",
  },
  {
    id: "ete",
    label: "Été",
    mood: "Bleu lagon et soleil",
    primary: "#0F5C6E",
    accent: "#F2A93B",
    accentText: "#F7CF8A",
  },
  {
    id: "automne",
    label: "Automne",
    mood: "Rouille et ambre",
    primary: "#7A2E1B",
    accent: "#D98B3A",
    accentText: "#EDBF8A",
  },
  {
    id: "elegant",
    label: "Neutre élégant",
    mood: "Anthracite et sable",
    primary: "#2B2B2B",
    accent: "#B8A58A",
    accentText: "#D9CDBB",
  },
];

export const DEFAULT_THEME_ID = "noel-classique";
export const THEME_IDS: readonly string[] = THEMES.map((t) => t.id);
export const isThemeId = (id: string) => THEME_IDS.includes(id);
export const getTheme = (id: string): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

// ---- Contraste (formules WCAG 2.x) -----------------------------------------------------------

export const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mélange `hex` avec `target` (0 = inchangé, 1 = cible). */
export function mix(hex: string, target: string, amount: number): string {
  const [a, b] = [channels(hex), channels(target)];
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${out
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

// ---- Résolution ------------------------------------------------------------------------------

/** Texte d'accent clair, déduit d'une couleur personnalisée : éclairci jusqu'à AA sur la couleur principale. */
export function deriveAccentText(accent: string, primary: string): string {
  for (let step = 0.35; step <= 1.0001; step += 0.05) {
    const candidate = mix(accent, CREAM, step);
    if (contrastRatio(candidate, primary) >= MIN_TEXT_CONTRAST) return candidate;
  }
  return CREAM;
}

export type AccentCheck = { ok: true } | { ok: false; message: string; suggestion: string | null };

/** Une couleur d'accent personnalisée doit rester visible sur la couleur principale ET sur le papier clair. */
export function checkAccent(themeId: string, accent: string): AccentCheck {
  const { primary } = getTheme(themeId);
  const passes = (c: string) =>
    contrastRatio(c, primary) >= MIN_GRAPHIC_CONTRAST &&
    contrastRatio(c, PAPER) >= MIN_ACCENT_ON_PAPER;
  if (passes(accent)) return { ok: true };

  const tooDark = contrastRatio(accent, primary) < MIN_GRAPHIC_CONTRAST;
  let suggestion: string | null = null;
  for (let step = 0.05; step <= 0.9; step += 0.05) {
    const candidate = mix(accent, tooDark ? CREAM : "#000000", step);
    if (passes(candidate)) {
      suggestion = candidate;
      break;
    }
  }
  return {
    ok: false,
    message: tooDark
      ? "Cette couleur est trop sombre : elle se verrait mal sur le fond foncé du thème."
      : "Cette couleur est trop claire : elle disparaîtrait sur les zones claires de la page.",
    suggestion,
  };
}

/** Couleurs effectives : celles du thème, avec l'accent personnalisé s'il est valide. */
export function resolveThemeTokens(themeId: string, accentOverride: string | null): ThemeTokens {
  const theme = getTheme(themeId);
  if (accentOverride && isHexColor(accentOverride) && checkAccent(theme.id, accentOverride).ok) {
    const accent = accentOverride.toUpperCase();
    return { primary: theme.primary, accent, accentText: deriveAccentText(accent, theme.primary) };
  }
  return { primary: theme.primary, accent: theme.accent, accentText: theme.accentText };
}

/** Variables CSS posées en ligne sur le conteneur : appliquées dès le rendu serveur, sans flash. */
export function themeCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--noel-burgundy": tokens.primary,
    "--noel-gold": tokens.accent,
    "--noel-gold-text": tokens.accentText,
  };
}
