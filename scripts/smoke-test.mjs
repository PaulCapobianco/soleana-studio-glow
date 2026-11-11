#!/usr/bin/env node
// Contrôle de production en LECTURE SEULE : requêtes GET/HEAD uniquement, 4 en parallèle au plus,
// aucun envoi de données, aucune authentification.
//
//   node scripts/smoke-test.mjs https://soleanastudio.fr
//
// Affiche un tableau OK / KO et sort avec un code non nul si au moins un contrôle échoue.
// La logique d'analyse (fonctions exportées) est testée sans réseau : scripts/smoke-test.test.mjs.

import { pathToFileURL } from "node:url";

export const PAGES = [
  "/",
  "/prestations",
  "/a-propos",
  "/faq",
  "/contact",
  "/mini-seances-noel-2026",
  "/photographe-grossesse-marseille",
  "/photographe-famille-marseille",
  "/photographe-couple-marseille",
  "/photographe-portrait-marseille",
  "/photographe-lifestyle-marseille",
  "/portfolio",
  "/portfolio/grossesse",
  "/portfolio/famille",
  "/portfolio/couple",
  "/portfolio/portrait",
];
export const GALLERY_PAGES = {
  "/photographe-grossesse-marseille": 2,
  "/photographe-famille-marseille": 2,
  "/photographe-couple-marseille": 3,
  "/photographe-portrait-marseille": 1,
};
export const CATEGORY_URLS = ["grossesse", "famille", "couple", "portrait"].map(
  (c) => `/portfolio/${c}`,
);
export const EXPECTED_SITEMAP_COUNT = 19;
export const EXPECTED_WIDTHS = [400, 800, 1200, 1600];
export const PELLI_HOST = "soleana-studio.pelli.io";

// ---- Analyse (fonctions pures) -----------------------------------------------------------------

export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

export function parseCsp(value) {
  const directives = {};
  for (const part of String(value ?? "").split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives[name.toLowerCase()] = sources;
  }
  return directives;
}

/** Vrai si la directive de la CSP autorise cet hôte (source exacte ou *.domaine). */
export function cspAllowsHost(csp, directive, host) {
  const d = parseCsp(csp);
  const sources = d[directive] ?? d["default-src"] ?? [];
  return sources.some((s) => {
    const bare = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return bare === host || (bare.startsWith("*.") && host.endsWith(bare.slice(1)));
  });
}

/** Problèmes d'en-têtes de sécurité d'une page publique (liste vide = conforme). */
export function checkPublicHeaders(get) {
  const problems = [];
  const csp = get("content-security-policy");
  if (!csp) problems.push("CSP bloquante absente");
  if (get("content-security-policy-report-only"))
    problems.push("une CSP Report-Only est aussi envoyée");
  if (csp) {
    const d = parseCsp(csp);
    for (const need of ["default-src", "frame-ancestors", "object-src", "base-uri"])
      if (!d[need]) problems.push(`CSP sans ${need}`);
  }
  const hsts = get("strict-transport-security") ?? "";
  if (!/max-age=(\d+)/.test(hsts) || Number(/max-age=(\d+)/.exec(hsts)[1]) < 15552000)
    problems.push("HSTS absent ou trop court");
  if ((get("x-content-type-options") ?? "").toLowerCase() !== "nosniff")
    problems.push("X-Content-Type-Options ≠ nosniff");
  if (!get("referrer-policy")) problems.push("Referrer-Policy absent");
  return problems;
}

export function isImmutableYear(cacheControl) {
  const cc = String(cacheControl ?? "");
  const m = /max-age=(\d+)/.exec(cc);
  return /\bimmutable\b/.test(cc) && Boolean(m) && Number(m[1]) >= 31536000;
}

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1];

/** Analyse du HTML d'une page galerie : balises <picture>, largeurs, dimensions, messages. */
export function analyzeGalleryHtml(html, expectedGalleries = 1) {
  const problems = [];
  if (/en cours de remplissage/i.test(html))
    problems.push("message « Galerie en cours de remplissage »");
  const sections = html
    .split(/<section id="gallery-/)
    .slice(1)
    .map((s) => s.split("</section>")[0]);
  if (sections.length < expectedGalleries)
    problems.push(`${sections.length} galerie(s) au lieu de ${expectedGalleries}`);
  const imageUrls = new Set();
  let pictures = 0;
  sections.forEach((section, i) => {
    const pic = /<picture>[\s\S]*?<\/picture>/.exec(section)?.[0];
    if (!pic) return problems.push(`galerie ${i + 1} : aucun <picture>`);
    pictures += 1;
    const sources = [...pic.matchAll(/<source[^>]*>/g)].map((m) => m[0]);
    const types = sources.map((s) => attr(s, "type"));
    if (types[0] !== "image/avif" || types[1] !== "image/webp")
      problems.push(
        `galerie ${i + 1} : sources ${types.join(",") || "absentes"} (AVIF puis WebP attendus)`,
      );
    for (const s of sources) {
      const widths = [...(attr(s, "srcset") ?? attr(s, "srcSet") ?? "").matchAll(/\s(\d+)w/g)]
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
      if (widths.join() !== EXPECTED_WIDTHS.join())
        problems.push(`galerie ${i + 1} : largeurs ${widths.join("/") || "aucune"}`);
      for (const m of (attr(s, "srcset") ?? attr(s, "srcSet") ?? "").matchAll(
        /(https?:\/\/[^\s,]+)/g,
      ))
        imageUrls.add(m[1]);
    }
    const img = /<img[^>]*>/.exec(pic)?.[0] ?? "";
    if (!attr(img, "width") || !attr(img, "height"))
      problems.push(`galerie ${i + 1} : dimensions absentes`);
    if (!attr(img, "alt")) problems.push(`galerie ${i + 1} : texte alternatif absent`);
    const src = attr(img, "src") ?? "";
    if (!/^https?:\/\//.test(src))
      problems.push(`galerie ${i + 1} : image locale (${src.slice(0, 40)})`);
    else imageUrls.add(src);
    if (/\/assets\//.test(pic)) problems.push(`galerie ${i + 1} : référence à /assets/`);
  });
  return { problems, imageUrls: [...imageUrls], pictures };
}

/** Lien ou formulaire de réservation Pelli dans la page Noël. */
export function findPelli(html) {
  const hrefs = [...html.matchAll(/(?:href|src)="(https:\/\/[^"]*pelli\.io[^"]*)"/g)].map(
    (m) => m[1],
  );
  return { found: hrefs.length > 0, hosts: [...new Set(hrefs.map((u) => new URL(u).host))] };
}

/** La chaîne de redirections de /admin aboutit à la page de connexion (jamais à une page d'admin). */
export function endsAtLogin(chain, finalBody) {
  const last = chain.at(-1);
  if (!last || last.status !== 200 || last.path !== "/admin/login") return false;
  return /Soleana Studio Admin/.test(finalBody) && !/Tableau de bord/.test(finalBody);
}

export function adminLeaks(html) {
  return [
    "service_role",
    "internal_note",
    "access_token",
    "refresh_token",
    "contact_requests",
  ].filter((word) => html.includes(word));
}

// ---- Réseau -----------------------------------------------------------------------------------

const MAX_PARALLEL = 4;

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

async function get(url, init = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { redirect: "manual", ...init });
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return fetch(url, { redirect: "manual", ...init });
}

export async function runSmokeTest(base) {
  const origin = base.replace(/\/+$/, "");
  const rows = [];
  const add = (group, name, ok, detail = "") => rows.push({ group, name, ok, detail });
  const pages = {};

  // 1. Pages publiques
  await pool(PAGES, async (path) => {
    const res = await get(origin + path);
    const html = res.status === 200 ? await res.text() : "";
    pages[path] = { status: res.status, html, headers: res.headers };
    add("pages", path, res.status === 200, `HTTP ${res.status}`);
  });
  const missing = await get(`${origin}/page-inexistante-smoke-test`);
  await missing.arrayBuffer();
  add("pages", "URL inexistante", missing.status === 404, `HTTP ${missing.status}`);

  // 2. Sitemap et robots.txt
  const sm = await get(`${origin}/sitemap.xml`);
  const urls = sm.status === 200 ? parseSitemap(await sm.text()) : [];
  const smPaths = urls.map((u) => new URL(u).pathname);
  const missingCats = CATEGORY_URLS.filter((c) => !smPaths.includes(c));
  add("sitemap", "19 URLs", urls.length === EXPECTED_SITEMAP_COUNT, `${urls.length} URLs`);
  add(
    "sitemap",
    "4 pages /portfolio/<catégorie>",
    missingCats.length === 0,
    missingCats.join(", ") || "présentes",
  );
  const robots = await get(`${origin}/robots.txt`);
  await robots.arrayBuffer();
  add("sitemap", "robots.txt", robots.status === 200, `HTTP ${robots.status}`);

  // 3. En-têtes
  const publicOnes = [
    "/",
    "/photographe-couple-marseille",
    "/portfolio/couple",
    "/mini-seances-noel-2026",
  ];
  for (const path of publicOnes) {
    const headers = pages[path]?.headers;
    const problems = headers ? checkPublicHeaders((n) => headers.get(n)) : ["page indisponible"];
    add(
      "en-têtes",
      `sécurité ${path}`,
      problems.length === 0,
      problems.join(" ; ") || "CSP bloquante, HSTS, nosniff, Referrer-Policy",
    );
  }
  const assetPath = /(?:href|src)="(\/assets\/[^"]+\.js)"/.exec(pages["/"]?.html ?? "")?.[1];
  if (assetPath) {
    const asset = await get(origin + assetPath, { method: "HEAD" });
    add(
      "en-têtes",
      `cache ${assetPath.slice(0, 32)}`,
      isImmutableYear(asset.headers.get("cache-control")),
      asset.headers.get("cache-control") ?? "absent",
    );
  } else add("en-têtes", "cache /assets", false, "aucun fichier /assets trouvé dans l'accueil");

  // 4 et 5. Galeries et images
  const imageTargets = new Set();
  for (const [path, expected] of Object.entries(GALLERY_PAGES)) {
    const html = pages[path]?.html ?? "";
    const a = analyzeGalleryHtml(html, expected);
    add(
      "galeries",
      path,
      a.problems.length === 0 && html !== "",
      a.problems.join(" ; ") || `${a.pictures} galerie(s), AVIF+WebP, 4 largeurs`,
    );
    a.imageUrls.forEach((u) => imageTargets.add(u));
  }
  const checked = await pool([...imageTargets], async (url) => {
    const res = await get(url, { headers: { Range: "bytes=0-0" } });
    await res.arrayBuffer();
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    return {
      url,
      ok: [200, 206].includes(res.status) && ["image/avif", "image/webp"].includes(type),
      status: res.status,
      type,
    };
  });
  const badImages = checked.filter((c) => !c.ok);
  add(
    "images",
    `${checked.length} URLs des 4 pages SEO`,
    checked.length > 0 && badImages.length === 0,
    badImages
      .slice(0, 3)
      .map((b) => `${b.status} ${b.type}`)
      .join(" ; ") || "toutes en 200, image/avif ou image/webp",
  );

  // 6. Pelli sur la page Noël
  const noel = pages["/mini-seances-noel-2026"];
  const pelli = findPelli(noel?.html ?? "");
  const csp = noel?.headers.get("content-security-policy") ?? "";
  add("Noël", "lien ou formulaire Pelli présent", pelli.found, pelli.hosts.join(", ") || "absent");
  add(
    "Noël",
    `CSP autorise ${PELLI_HOST}`,
    cspAllowsHost(csp, "frame-src", PELLI_HOST),
    "frame-src",
  );

  // 7. Admin
  const login = await get(`${origin}/admin/login`);
  const loginHtml = login.status === 200 ? await login.text() : "";
  add("admin", "/admin/login", login.status === 200, `HTTP ${login.status}`);
  // /admin redirige d'abord vers /admin/dashboard puis vers la connexion : on suit la chaîne.
  const chain = [];
  let adminBody = "";
  let adminUrl = `${origin}/admin`;
  for (let hop = 0; hop < 5; hop += 1) {
    const res = await get(adminUrl);
    const location = res.headers.get("location") ?? "";
    chain.push({ status: res.status, path: new URL(adminUrl).pathname, location });
    if (![301, 302, 303, 307, 308].includes(res.status) || !location) {
      adminBody = res.status === 200 ? await res.text() : (await res.arrayBuffer(), "");
      break;
    }
    await res.arrayBuffer();
    adminUrl = new URL(location, adminUrl).toString();
  }
  const guarded = endsAtLogin(chain, adminBody);
  add(
    "admin",
    "/admin sans session → connexion",
    guarded,
    chain.map((h) => `${h.status} ${h.path}`).join(" → "),
  );
  const leaks = adminLeaks(loginHtml + adminBody);
  add(
    "admin",
    "aucune donnée d'admin dans le HTML",
    leaks.length === 0,
    leaks.join(", ") || "rien de sensible",
  );

  return rows;
}

export function renderTable(rows) {
  const width = Math.max(...rows.map((r) => r.name.length), 10);
  return rows
    .map((r) => `${r.ok ? "OK" : "KO"}  ${r.group.padEnd(9)} ${r.name.padEnd(width)}  ${r.detail}`)
    .join("\n");
}

async function main() {
  const target = process.argv[2];
  if (!target || !/^https?:\/\//.test(target)) {
    console.error("Usage : node scripts/smoke-test.mjs https://soleanastudio.fr");
    process.exit(2);
  }
  const rows = await runSmokeTest(target);
  console.log(renderTable(rows));
  const ko = rows.filter((r) => !r.ok);
  console.log(
    `\n${rows.length - ko.length}/${rows.length} contrôles OK${ko.length ? ` — ${ko.length} KO` : ""}`,
  );
  process.exit(ko.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Erreur du contrôle :", error.message);
    process.exit(2);
  });
}
