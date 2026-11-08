// Dates d'événement : des jours entiers « AAAA-MM-JJ », sans heure. Tous les calculs passent par
// UTC pour qu'aucun fuseau (serveur, navigateur) ne décale un jour.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options });

const WEEKDAY = fmt({ weekday: "long" });
const DAY = fmt({ day: "numeric" });
const MONTH = fmt({ month: "long" });
const YEAR = fmt({ year: "numeric" });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dayNumber = (iso: string) => DAY.format(toUtc(iso)).replace(/^1$/, "1er");

function sortedUnique(dates: readonly string[]): string[] {
  return [...new Set(dates)].filter(isIsoDate).sort();
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

/** « Samedi 28 novembre 2026 » */
export function formatLongDate(iso: string): string {
  const date = toUtc(iso);
  return capitalize(
    `${WEEKDAY.format(date)} ${dayNumber(iso)} ${MONTH.format(date)} ${YEAR.format(date)}`,
  );
}

/** Groupe par mois : { month: "novembre", year: "2026", items: ["samedi 28", "dimanche 29"] }. */
function groupByMonth(dates: string[]) {
  const groups: { key: string; month: string; year: string; days: string[]; weekdays: string[] }[] =
    [];
  for (const iso of dates) {
    const date = toUtc(iso);
    const key = iso.slice(0, 7);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, month: MONTH.format(date), year: YEAR.format(date), days: [], weekdays: [] };
      groups.push(group);
    }
    group.days.push(dayNumber(iso));
    group.weekdays.push(`${WEEKDAY.format(date)} ${dayNumber(iso)}`);
  }
  return groups;
}

/** Bandeau du haut de page : « Samedi 28 et dimanche 29 novembre » (année omise). */
export function formatHeroDates(dates: readonly string[]): string {
  const groups = groupByMonth(sortedUnique(dates));
  return capitalize(joinList(groups.map((g) => `${joinList(g.weekdays)} ${g.month}`)));
}

/** Teaser d'accueil : « 28 & 29 novembre 2026 » */
export function formatTeaserDates(dates: readonly string[]): string {
  const groups = groupByMonth(sortedUnique(dates));
  if (groups.length === 0) return "";
  const years = new Set(groups.map((g) => g.year));
  const body = groups.map((g) => `${g.days.join(" & ")} ${g.month}`).join(" & ");
  return years.size === 1 ? `${body} ${groups[0].year}` : body;
}

/**
 * Phrase de report météo : « aux 5 et 6 décembre (samedi 5 et dimanche 6 décembre 2026) ».
 * Retourne une chaîne vide s'il n'y a pas de date de report.
 */
export function formatFallbackSentence(dates: readonly string[]): string {
  const sorted = sortedUnique(dates);
  if (sorted.length === 0) return "";
  const groups = groupByMonth(sorted);
  const short = joinList(groups.map((g) => `${joinList(g.days)} ${g.month}`));
  const long = joinList(groups.map((g) => `${joinList(g.weekdays)} ${g.month}`));
  const years = new Set(groups.map((g) => g.year));
  const longWithYear = years.size === 1 ? `${long} ${groups[0].year}` : long;
  const article = sorted.length === 1 ? "au" : "aux";
  return `En cas de mauvais temps, les séances sont reportées ${article} ${short} (${longWithYear}).`;
}

/** Jour courant à Paris, « AAAA-MM-JJ » (les dates d'événement sont des jours entiers, heure de Paris). */
export function parisToday(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Prochaine date (aujourd'hui compris) parmi les séances et les dates de report ; null s'il n'en reste aucune. */
export function nextEventDate(
  eventDates: readonly string[],
  fallbackDates: readonly string[],
  now: Date,
): string | null {
  const today = parisToday(now);
  return sortedUnique([...eventDates, ...fallbackDates]).find((d) => d >= today) ?? null;
}

// ---- Fin d'édition -------------------------------------------------------------------------

function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Instant où l'édition bascule en « terminée » : minuit (heure de Paris) après le dernier jour,
 * date de report comprise. null s'il n'y a aucune date.
 */
export function editionEndsAt(
  eventDates: readonly string[],
  fallbackDates: readonly string[],
): Date | null {
  const all = sortedUnique([...eventDates, ...fallbackDates]);
  if (all.length === 0) return null;
  const nextDay = new Date(toUtc(all[all.length - 1]).getTime() + 24 * 3600 * 1000);
  const guess = new Date(nextDay.getTime());
  return new Date(nextDay.getTime() - parisOffsetMinutes(guess) * 60000);
}

export function isEditionOver(
  eventDates: readonly string[],
  fallbackDates: readonly string[],
  now: Date,
): boolean {
  const end = editionEndsAt(eventDates, fallbackDates);
  return end !== null && now.getTime() >= end.getTime();
}
