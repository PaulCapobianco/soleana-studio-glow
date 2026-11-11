// Relais d'images : /img/<chemin> sert, depuis le domaine du site et avec le cache Cloudflare, les
// fichiers publics du bucket Supabase « photos ». DÉSACTIVÉ PAR DÉFAUT (variable de build
// VITE_IMAGE_PROXY=true pour l'activer). Voir docs/images-cloudflare-cache.md.
//
// Sécurité : seuls des chemins de variantes conformes à la politique Storage sont relayés
// (galleries/… ou events/<uuid>/cover-…), jamais de `..`, de `%`, de `//` ni de redirection suivie ;
// GET et HEAD uniquement ; aucun en-tête du visiteur n'est transmis à Supabase ; seules des réponses
// image/avif ou image/webp de moins de 3 Mo sont servies.

export const IMAGE_PROXY_ENABLED = import.meta.env.VITE_IMAGE_PROXY === "true";
export const IMAGE_PROXY_PREFIX = "/img/";
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;

const BUCKET = "photos";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// Mêmes motifs que les politiques Storage (supabase/migrations/20260926000005…).
const GALLERY_PATH =
  /^galleries\/[a-z0-9][a-z0-9_-]*\/[a-f0-9]{12,32}\/[a-f0-9]{8}-(400|800|1200|1600|[1-9][0-9]{0,2}|1[0-5][0-9]{2})\.(avif|webp)$/;
const EVENT_COVER_PATH =
  /^events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover-(800|1600)-[0-9]{10,16}\.webp$/;

/** Chemin Storage demandé par /img/<chemin>, ou null s'il n'est pas strictement autorisé. */
export function parseImagePath(pathname: string): string | null {
  if (!pathname.startsWith(IMAGE_PROXY_PREFIX)) return null;
  if (/[%\\]|\.\.|\/\//.test(pathname)) return null; // pas d'encodage, de remontée ni de doublon
  const path = pathname.slice(IMAGE_PROXY_PREFIX.length);
  return GALLERY_PATH.test(path) || EVENT_COVER_PATH.test(path) ? path : null;
}

/** URL relative servie par le relais pour un chemin Storage (utilisée à la place de l'URL Supabase). */
export function proxiedImageUrl(storagePath: string): string {
  return `${IMAGE_PROXY_PREFIX}${storagePath}`;
}

export type ImageProxyCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

export type ImageProxyDeps = {
  supabaseUrl: string;
  fetchUpstream: (url: string, init: RequestInit) => Promise<Response>;
  cache: ImageProxyCache | null;
  waitUntil: (promise: Promise<unknown>) => void;
};

const plain = (status: number, extra: Record<string, string> = {}) =>
  new Response(null, { status, headers: { "X-Content-Type-Options": "nosniff", ...extra } });

function forMethod(method: string, response: Response): Response {
  return method === "HEAD" ? new Response(null, response) : response;
}

export async function handleImageRequest(
  request: Request,
  deps: ImageProxyDeps,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return plain(405, { Allow: "GET, HEAD" });
  }
  const url = new URL(request.url);
  const path = parseImagePath(url.pathname);
  if (!path) return plain(404);

  // Clé de cache = chemin seul (les paramètres de requête ne créent pas d'entrées).
  const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
  const hit = await deps.cache?.match(cacheKey);
  if (hit) return forMethod(request.method, hit);

  let upstream: Response;
  try {
    upstream = await deps.fetchUpstream(
      `${deps.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${path}`,
      { method: "GET", redirect: "manual", headers: { Accept: "image/avif,image/webp" } },
    );
  } catch {
    return plain(502, { "Cache-Control": "no-store" });
  }
  if (upstream.status === 404 || upstream.status === 400) {
    return plain(404, { "Cache-Control": "public, max-age=60" });
  }
  if (upstream.status !== 200) return plain(502, { "Cache-Control": "no-store" });

  const type = upstream.headers.get("content-type") ?? "";
  const length = Number(upstream.headers.get("content-length"));
  if (!/^image\/(avif|webp)$/.test(type.split(";")[0].trim().toLowerCase())) {
    return plain(502, { "Cache-Control": "no-store" });
  }
  if (!Number.isFinite(length) || length <= 0 || length > IMAGE_MAX_BYTES) {
    return plain(502, { "Cache-Control": "no-store" });
  }

  // Liste blanche d'en-têtes : rien d'autre ne traverse (ni cookie, ni jeton, ni en-tête Supabase).
  const headers = new Headers({
    "Content-Type": type,
    "Content-Length": String(length),
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = new Response(upstream.body, { status: 200, headers });
  if (deps.cache) deps.waitUntil(deps.cache.put(cacheKey, response.clone()));
  return forMethod(request.method, response);
}
