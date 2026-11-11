import { IMAGE_PROXY_ENABLED, proxiedImageUrl } from "@/lib/image-proxy";

const BUCKET = "photos";

/**
 * Seul endroit qui construit l'URL publique d'une image stockée. Pour passer par un sous-domaine
 * Cloudflare (cache), définir VITE_IMAGE_BASE_URL (ex. https://images.soleanastudio.fr) : les
 * composants n'ont pas à changer. Sans cette variable, on utilise l'URL publique du bucket Supabase.
 */
export function publicImageUrl(storagePath: string): string {
  const base = import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${storagePath}`;
  if (IMAGE_PROXY_ENABLED) return proxiedImageUrl(storagePath);
  // Même résultat que `supabase.storage.from(BUCKET).getPublicUrl(path)`, sans charger supabase-js.
  const projectUrl = (
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : "")
  )?.replace(/\/+$/, "");
  return encodeURI(`${projectUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`);
}
