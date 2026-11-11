// PostgREST (Supabase) plafonne chaque réponse à 1 000 lignes par défaut, sans erreur : une requête
// sans `.range()` rend alors un résultat tronqué en silence. Les listes d'administration qui peuvent
// dépasser ce seuil (variantes de photos : 8 par photo) se lisent page par page avec ce helper.

export const SUPABASE_PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; error: unknown };

/**
 * Lit toutes les lignes en appelant `fetchPage(from, to)` (bornes incluses, comme `.range()`) jusqu'à
 * une page incomplète. La requête doit avoir un `.order()` stable (ex. par id), sinon des lignes
 * peuvent être répétées ou manquées entre deux pages. Lève l'erreur Supabase telle quelle.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE,
  maxPages = 100,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  throw new Error("Trop de lignes à lire : pagination interrompue par sécurité.");
}
