// Mesure locale, dans Chrome, des octets d'images réellement chargés pour une galerie complète.
// Reproduit les balises et attributs sizes de CategoryGallerySection ; fait défiler chaque image.
// N'utilise ni production ni Supabase. Usage : node scripts/photos-storage/measure-gallery-bytes.mjs
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { VARIANTS_DIR, ROOT, readManifest } from "./lib.mjs";

const seo = "photographe-couple-marseille";
const slot = "gallery-1";
const manifest = await readManifest();
const matches = JSON.parse(await readFile(path.join(VARIANTS_DIR, "original-matches.json"), "utf8"));
const index = JSON.parse(await readFile(path.join(VARIANTS_DIR, "variants-index.json"), "utf8"));
const byMatch = new Map(matches.matches.map((item) => [item.source_key, item]));
const byVariants = new Map();
for (const variant of index.variants) {
  if (!byVariants.has(variant.source_key)) byVariants.set(variant.source_key, []);
  byVariants.get(variant.source_key).push(variant);
}
const placements = manifest.placements.filter((item) => item.seo_slug === seo && item.slot === slot)
  .sort((a, b) => a.display_order - b.display_order);
if (placements.length !== 10 || index.version !== 3) throw new Error("Galerie ou variantes inattendues.");

const images = new Map();
for (const [n, placement] of placements.entries()) {
  const match = byMatch.get(placement.source_key);
  images.set(`/image/legacy/${n}.webp`, path.join(ROOT, match.source_webp));
  for (const variant of byVariants.get(placement.source_key) ?? []) {
    images.set(`/image/variant/${n}-${variant.width}.${variant.format}`, path.join(VARIANTS_DIR, variant.file));
  }
}

function picture(n, placement, after) {
  const size = n === 0 ? "(min-width: 1024px) 960px, 100vw" : "(min-width: 1024px) 300px, 45vw";
  const legacy = `/image/legacy/${n}.webp`;
  const klass = n === 0 ? "featured" : "tile";
  const variants = byVariants.get(placement.source_key) ?? [];
  const srcset = (format) => variants.filter((item) => item.format === format)
    .sort((a, b) => a.width - b.width)
    .map((item) => `/image/variant/${n}-${item.width}.${format} ${item.width}w`).join(", ");
  const webp = variants.filter((item) => item.format === "webp").sort((a, b) => b.width - a.width)[0];
  const image = after
    ? `<img loading="lazy" src="/image/variant/${n}-${webp.width}.webp" srcset="${srcset("webp")}" sizes="${size}" alt="photo ${n}">`
    : `<img loading="lazy" src="${legacy}" alt="photo ${n}">`;
  return `<div class="${klass}">${after ? `<picture><source type="image/avif" srcset="${srcset("avif")}" sizes="${size}"><source type="image/webp" srcset="${srcset("webp")}" sizes="${size}">${image}</picture>` : image}</div>`;
}

function page(after) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{margin:0} .gallery{max-width:1200px;margin:auto;padding:24px} .featured{height:600px}
    .tiles{display:grid;grid-template-columns:1fr;gap:16px;margin-top:24px}
    @media(min-width:640px){.tiles{grid-template-columns:repeat(2,1fr)}}
    @media(min-width:1024px){.tiles{grid-template-columns:repeat(3,1fr)}}
    .tile{height:400px} picture,img{display:block;width:100%;height:100%;object-fit:cover}
  </style></head><body><main class="gallery">${picture(0, placements[0], after)}<div class="tiles">${placements.slice(1).map((item, index) => picture(index + 1, item, after)).join("")}</div></main></body></html>`;
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/before" || pathname === "/after") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(page(pathname === "/after"));
      return;
    }
    const file = images.get(pathname);
    if (!file) { response.writeHead(404); response.end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, {
      "content-type": file.endsWith(".avif") ? "image/avif" : "image/webp",
      "content-length": bytes.length,
      "cache-control": "no-store",
    });
    response.end(bytes);
  } catch (error) {
    response.writeHead(500); response.end(String(error));
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(path.join(os.tmpdir(), "soleana-gallery-measure-"));
const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--remote-debugging-port=0", "--remote-allow-origins=*", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!port) throw new Error("Chrome DevTools indisponible.");
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  let loadPage;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Page.loadEventFired" && loadPage) { loadPage(); loadPage = undefined; }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Network.enable");
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  for (const { width, dpr } of [{ width: 360, dpr: 3 }, { width: 768, dpr: 2 }, { width: 1280, dpr: 1 }]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: dpr, mobile: width < 768 });
    for (const after of [false, true]) {
      const loaded = new Promise((resolve) => { loadPage = resolve; });
      await command("Page.navigate", { url: `${origin}/${after ? "after" : "before"}` });
      await loaded;
      const result = await command("Runtime.evaluate", {
        expression: `(async () => {
          if (document.readyState !== "complete") await new Promise(resolve => window.addEventListener("load", resolve, {once:true}));
          for (const image of document.images) { image.scrollIntoView(); await image.decode(); }
          return performance.getEntriesByType("resource")
            .filter(entry => entry.name.includes("/image/"))
            .map(entry => ({url: entry.name, bytes: entry.encodedBodySize}));
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      const resources = result.result.value;
      if (resources.length !== placements.length ||
          resources.some((item) => item.bytes <= 0 || !item.url.endsWith(after ? ".avif" : ".webp"))) {
        throw new Error(`Mesure incomplète ou mauvais format à ${width} px (${after ? "après" : "avant"}).`);
      }
      console.log(JSON.stringify({ gallery: `${seo}/${slot}`, width, dpr,
        mode: after ? "avif" : "legacy_webp", requests: resources.length,
        bytes: resources.reduce((sum, item) => sum + item.bytes, 0) }));
    }
  }
  socket.close();
} finally {
  chrome.kill("SIGTERM");
  server.close();
  await rm(profile, { recursive: true, force: true });
}
