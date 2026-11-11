import { describe, expect, it, vi } from "vitest";
import {
  handleImageRequest,
  IMAGE_MAX_BYTES,
  parseImagePath,
  proxiedImageUrl,
  type ImageProxyCache,
  type ImageProxyDeps,
} from "./image-proxy";

const GOOD = "galleries/couple/dd39da108b84/0ac3dbfa-400.avif";
const COVER = "events/0b1c2d3e-0000-4000-8000-000000000000/cover-800-1700000000000.webp";

function memoryCache(): ImageProxyCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    async match(request) {
      return store.get(request.url)?.clone();
    },
    async put(request, response) {
      store.set(request.url, response);
    },
  };
}

function upstreamOk(body = "x".repeat(1000), extra: Record<string, string> = {}) {
  return vi.fn(
    async () =>
      new Response(body, {
        status: 200,
        headers: {
          "content-type": "image/avif",
          "content-length": String(body.length),
          etag: '"abc"',
          "set-cookie": "sb=1",
          "x-supabase-secret": "nope",
          "cache-control": "private, no-cache",
          ...extra,
        },
      }),
  );
}

function deps(over: Partial<ImageProxyDeps> = {}): ImageProxyDeps & { waited: Promise<unknown>[] } {
  const waited: Promise<unknown>[] = [];
  return {
    supabaseUrl: "https://project.supabase.co/",
    fetchUpstream: upstreamOk(),
    cache: memoryCache(),
    waitUntil: (p) => waited.push(p),
    waited,
    ...over,
  };
}

const req = (path: string, init?: RequestInit) =>
  new Request(`https://soleanastudio.fr${path}`, init);

describe("parseImagePath", () => {
  it("accepte seulement les chemins de variantes et de couvertures", () => {
    expect(parseImagePath(`/img/${GOOD}`)).toBe(GOOD);
    expect(parseImagePath(`/img/${COVER}`)).toBe(COVER);
  });
  it.each([
    "/img/",
    "/img/galleries/couple/../../secret.avif",
    "/img/galleries/couple/dd39da108b84/0ac3dbfa-400.avif/../x",
    "/img/galleries%2fcouple/dd39da108b84/0ac3dbfa-400.avif",
    "/img/galleries/couple/dd39da108b84/0ac3dbfa-400.svg",
    "/img/galleries/couple/dd39da108b84/0ac3dbfa-400.avif.html",
    "/img/galleries//couple/dd39da108b84/0ac3dbfa-400.avif",
    "/img/galleries\\couple/dd39da108b84/0ac3dbfa-400.avif",
    "/img/https://evil.example/x.avif",
    "/img//evil.example/x.avif",
    "/img/other-bucket/galleries/couple/dd39da108b84/0ac3dbfa-400.avif",
    "/img/galleries/couple/dd39da108b84/0ac3dbfa-9999.avif",
    "/images/" + GOOD,
    "/" + GOOD,
  ])("refuse %s", (pathname) => {
    expect(parseImagePath(pathname)).toBeNull();
  });
  it("proxiedImageUrl reste relatif au domaine du site (pas de redirection ouverte)", () => {
    expect(proxiedImageUrl(GOOD)).toBe(`/img/${GOOD}`);
    expect(proxiedImageUrl(GOOD).startsWith("//")).toBe(false);
  });
});

describe("handleImageRequest", () => {
  it("relaie une image avec un cache long et immutable", async () => {
    const d = deps();
    const res = await handleImageRequest(req(`/img/${GOOD}`), d);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("content-type")).toBe("image/avif");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-image-cache")).toBe("MISS");
    expect((await res.arrayBuffer()).byteLength).toBe(1000);
    expect(d.fetchUpstream).toHaveBeenCalledWith(
      `https://project.supabase.co/storage/v1/object/public/photos/${GOOD}`,
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    );
  });

  it("ne transmet aucun en-tête sensible, dans aucun sens", async () => {
    const d = deps();
    const res = await handleImageRequest(
      req(`/img/${GOOD}`, {
        headers: { cookie: "session=abc", authorization: "Bearer secret", "x-api-key": "k" },
      }),
      d,
    );
    const sent = (d.fetchUpstream as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const names = Object.keys(sent.headers as Record<string, string>).map((n) => n.toLowerCase());
    expect(names).toEqual(["accept"]);
    for (const name of ["set-cookie", "x-supabase-secret"])
      expect(res.headers.has(name)).toBe(false);
    expect(res.headers.get("cache-control")).not.toContain("private");
  });

  it("sert le cache sans rappeler Supabase (évite les 429)", async () => {
    const d = deps();
    await handleImageRequest(req(`/img/${GOOD}`), d);
    await Promise.all(d.waited);
    const again = await handleImageRequest(req(`/img/${GOOD}?utm=1`), d);
    expect(again.status).toBe(200);
    expect(again.headers.get("x-image-cache")).toBe("HIT");
    expect(d.fetchUpstream).toHaveBeenCalledTimes(1);
  });

  it("HEAD renvoie les en-têtes sans corps ; les autres méthodes sont refusées", async () => {
    const d = deps();
    const head = await handleImageRequest(req(`/img/${GOOD}`, { method: "HEAD" }), d);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    for (const method of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      const res = await handleImageRequest(req(`/img/${GOOD}`, { method }), d);
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("GET, HEAD");
    }
    expect(d.fetchUpstream).toHaveBeenCalledTimes(1);
  });

  it("ne contacte jamais Supabase pour un chemin non autorisé", async () => {
    const d = deps();
    for (const p of ["/img/../etc/passwd", "/img/%2e%2e/x", "/img/galleries/x.html", "/img/"]) {
      expect((await handleImageRequest(req(p), d)).status).toBe(404);
    }
    expect(d.fetchUpstream).not.toHaveBeenCalled();
  });

  it("ne suit pas une redirection et refuse un type ou une taille inattendus", async () => {
    const redirect = deps({
      fetchUpstream: vi.fn(
        async () =>
          new Response(null, { status: 302, headers: { location: "https://evil.example/" } }),
      ),
    });
    const r1 = await handleImageRequest(req(`/img/${GOOD}`), redirect);
    expect(r1.status).toBe(502);
    expect(r1.headers.get("location")).toBeNull();

    const html = deps({
      fetchUpstream: upstreamOk("<script>1</script>", { "content-type": "text/html" }),
    });
    expect((await handleImageRequest(req(`/img/${GOOD}`), html)).status).toBe(502);
    const svg = deps({ fetchUpstream: upstreamOk("<svg/>", { "content-type": "image/svg+xml" }) });
    expect((await handleImageRequest(req(`/img/${GOOD}`), svg)).status).toBe(502);

    const huge = deps({
      fetchUpstream: upstreamOk("x", { "content-length": String(IMAGE_MAX_BYTES + 1) }),
    });
    expect((await handleImageRequest(req(`/img/${GOOD}`), huge)).status).toBe(502);
    const noLength = deps({
      fetchUpstream: vi.fn(
        async () => new Response("x", { headers: { "content-type": "image/webp" } }),
      ),
    });
    expect((await handleImageRequest(req(`/img/${GOOD}`), noLength)).status).toBe(502);
  });

  it("n'écrit rien en cache pour une erreur, et mappe 404 / erreurs réseau", async () => {
    const cache = memoryCache();
    const notFound = deps({
      cache,
      fetchUpstream: vi.fn(async () => new Response("no", { status: 404 })),
    });
    const r404 = await handleImageRequest(req(`/img/${GOOD}`), notFound);
    expect(r404.status).toBe(404);
    expect(r404.headers.get("cache-control")).toBe("public, max-age=60");
    const boom = deps({
      cache,
      fetchUpstream: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const r502 = await handleImageRequest(req(`/img/${GOOD}`), boom);
    expect(r502.status).toBe(502);
    expect(r502.headers.get("cache-control")).toBe("no-store");
    expect(cache.store.size).toBe(0);
  });
});
