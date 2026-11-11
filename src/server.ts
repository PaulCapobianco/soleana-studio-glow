import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  handleImageRequest,
  IMAGE_PROXY_ENABLED,
  IMAGE_PROXY_PREFIX,
  type ImageProxyCache,
} from "./lib/image-proxy";
import { securityHeadersFor } from "./lib/security-headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// A `public/_headers` file only covers static assets served directly by Cloudflare (they never
// reach this Worker) ; every response this fetch handler returns (SSR pages, server functions, the
// error responses below) gets its headers here, from src/lib/security-headers.ts.
function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeadersFor(new URL(request.url).pathname))) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Relais d'images (désactivé par défaut : VITE_IMAGE_PROXY=true au build), avant l'application.
    if (IMAGE_PROXY_ENABLED && new URL(request.url).pathname.startsWith(IMAGE_PROXY_PREFIX)) {
      const context = ctx as { waitUntil?: (promise: Promise<unknown>) => void } | undefined;
      const cacheStorage = (globalThis as { caches?: { default?: ImageProxyCache } }).caches;
      return handleImageRequest(request, {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
        fetchUpstream: (url, init) => fetch(url, init),
        cache: cacheStorage?.default ?? null,
        waitUntil: (promise) => context?.waitUntil?.(promise),
      });
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
