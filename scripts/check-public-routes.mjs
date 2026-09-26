// Run against the local fixture server only. Never sends mutations.
import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://127.0.0.1:5187");
assert(
  ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname),
  "Only loopback hosts are allowed",
);
const routes = [
  "/",
  "/portfolio",
  "/prestations",
  "/faq",
  "/a-propos",
  "/contact",
  "/reservation",
  "/espace-client",
  "/mentions-legales",
  "/confidentialite",
  "/mini-seances-noel-2026",
  ...["couple", "famille", "grossesse", "portrait", "lifestyle"].map(
    (c) => `/photographe-${c}-marseille`,
  ),
];
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  const html = await response.text();
  assert.equal(response.status, 200, route);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${route}: H1`);
  assert.equal((html.match(/<title>/g) ?? []).length, 1, `${route}: title`);
  assert.equal((html.match(/property="og:image"/g) ?? []).length, 1, `${route}: OG image`);
  assert(!html.includes("PRIVATE_POSTGREST_DETAIL"), route);
  if (route !== "/espace-client")
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, `${route}: canonical`);
  else assert(/name="robots" content="noindex,nofollow"/.test(html));
  if (route === "/faq")
    assert(html.includes("Réponse locale SSR"), "FAQ answers must be in server HTML");
  if (route === "/prestations")
    assert(html.includes("Prestation locale de vérification"), "Services must be in server HTML");
  if (route === "/") {
    assert(html.includes("7 &amp; 11 novembre 2026"));
    assert(html.indexOf('id="noel-teaser-title"') < html.indexOf("Des instants,"));
  }
  console.log(`PASS 200 SSR ${route}`);
}
for (const [route, status] of [
  ["/audit-not-found", 404],
  ["/contact/inconnue", 404],
  ["/portfolio/inconnue", 404],
  ["/audit-error", 500],
]) {
  const response = await fetch(new URL(route, base));
  const html = await response.text();
  assert.equal(response.status, status, route);
  assert(/name="robots" content="noindex/.test(html), `${route}: robots`);
  assert(
    !html.includes("PRIVATE_POSTGREST_DETAIL") && !html.includes("PGRST999"),
    `${route}: technical details`,
  );
  console.log(`PASS ${status} noindex ${route}`);
}
const robots = await (await fetch(new URL("/robots.txt", base))).text();
assert(robots.includes("Disallow: /admin"));
const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
assert(sitemap.includes("https://soleanastudio.fr/mini-seances-noel-2026"));
const redirect = await fetch(new URL("/tarifs", base), { redirect: "manual" });
assert([301, 302, 307, 308].includes(redirect.status));
assert(redirect.headers.get("location")?.includes("/prestations"));
const admin = await fetch(new URL("/admin/pages-seo", base), { redirect: "manual" });
assert([301, 302, 307, 308].includes(admin.status));
assert(admin.headers.get("location")?.includes("/admin/login"));
console.log("PASS robots, sitemap, legacy redirect and anonymous admin redirect");
