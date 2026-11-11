// En-têtes de sécurité du Worker (voir src/server.ts). Fonctions pures, testées.
//
// CSP : appliquée (bloquante) sur le site public ; en simple rapport (Report-Only) sur /admin, dont
// l'envoi de photos (réencodage AVIF/WebP en WebAssembly, aperçus blob:) n'a pas pu être testé dans
// un navigateur connecté. Les deux utilisent la même politique : un `blob:`/WebAssembly oublié se
// verrait dans la console de l'admin sans casser l'envoi.

const SUPABASE_HOST = "https://kvzzzwjddanwedzotaka.supabase.co";
const PELLI_HOST = "https://soleana-studio.pelli.io";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'unsafe-inline' : scripts d'hydratation de TanStack Start et JSON-LD en ligne. Un nonce par
  // requête les remplacerait (voir docs/AUDIT-SECURITE-2026-11.md). 'wasm-unsafe-eval' : encodeurs
  // AVIF/WebP de l'admin (WebAssembly uniquement, pas d'eval JavaScript).
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'", // attributs style={{…}} de React
  "font-src 'self'", // polices auto-hébergées
  `img-src 'self' data: blob: ${SUPABASE_HOST}`,
  `connect-src 'self' ${SUPABASE_HOST}`,
  `frame-src ${PELLI_HOST}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const BASE_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** En-têtes à ajouter à la réponse d'une page : CSP bloquante en public, en rapport seul sur /admin. */
export function securityHeadersFor(pathname: string): Record<string, string> {
  if (isAdminPath(pathname)) {
    // `upgrade-insecure-requests` est ignorée (et signalée en console) dans une politique Report-Only.
    const reportOnly = CONTENT_SECURITY_POLICY.replace("; upgrade-insecure-requests", "");
    return { ...BASE_HEADERS, "Content-Security-Policy-Report-Only": reportOnly };
  }
  return { ...BASE_HEADERS, "Content-Security-Policy": CONTENT_SECURITY_POLICY };
}
