import { describe, expect, it } from "vitest";
import {
  adminLeaks,
  analyzeGalleryHtml,
  checkPublicHeaders,
  endsAtLogin,
  cspAllowsHost,
  findPelli,
  isImmutableYear,
  parseCsp,
  parseSitemap,
  renderTable,
} from "./smoke-test.mjs";

const host = "https://p.supabase.co/storage/v1/object/public/photos/galleries/couple/aaaaaaaaaaaa";
const set = (fmt) =>
  [400, 800, 1200, 1600].map((w) => `${host}/0000000${w % 10}-${w}.${fmt} ${w}w`).join(", ");
const picture = (over = {}) =>
  `<section id="gallery-x-1"><button><picture><source type="${over.first ?? "image/avif"}" srcSet="${over.avif ?? set("avif")}" sizes="100vw"/><source type="image/webp" srcSet="${set("webp")}" sizes="100vw"/><img src="${over.src ?? `${host}/00000006-1600.webp`}" alt="Séance" ${over.dims ?? 'width="1600" height="2000"'}/></picture></button></section>`;

describe("analyzeGalleryHtml", () => {
  it("accepte une galerie conforme et relève ses URLs d'images", () => {
    const a = analyzeGalleryHtml(picture() + picture(), 2);
    expect(a.problems).toEqual([]);
    expect(a.pictures).toBe(2);
    expect(a.imageUrls.length).toBeGreaterThan(8);
  });
  it("signale le message de galerie vide", () => {
    expect(
      analyzeGalleryHtml(picture() + "<p>Galerie en cours de remplissage...</p>", 1).problems[0],
    ).toMatch(/remplissage/);
  });
  it("signale un nombre de galeries insuffisant", () => {
    expect(analyzeGalleryHtml(picture(), 3).problems.join()).toMatch(/1 galerie\(s\) au lieu de 3/);
  });
  it("exige AVIF avant WebP, 4 largeurs, dimensions et image distante", () => {
    expect(analyzeGalleryHtml(picture({ first: "image/webp" }), 1).problems.join()).toMatch(
      /AVIF puis WebP/,
    );
    expect(
      analyzeGalleryHtml(
        picture({ avif: set("avif").split(", ").slice(0, 3).join(", ") }),
        1,
      ).problems.join(),
    ).toMatch(/largeurs 400\/800\/1200/);
    expect(analyzeGalleryHtml(picture({ dims: "" }), 1).problems.join()).toMatch(
      /dimensions absentes/,
    );
    expect(
      analyzeGalleryHtml(picture({ src: "/assets/couple-1-abc.webp" }), 1).problems.join(),
    ).toMatch(/image locale/);
  });
});

describe("en-têtes", () => {
  const good = {
    "content-security-policy":
      "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; frame-src https://soleana-studio.pelli.io",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  const get = (h) => (name) => h[name];
  it("accepte des en-têtes conformes", () => {
    expect(checkPublicHeaders(get(good))).toEqual([]);
  });
  it("refuse une CSP absente, en rapport seul, ou sans directives clés", () => {
    const { "content-security-policy": _c, ...rest } = good;
    expect(checkPublicHeaders(get(rest)).join()).toMatch(/CSP bloquante absente/);
    expect(
      checkPublicHeaders(
        get({ ...good, "content-security-policy-report-only": "default-src 'self'" }),
      ).join(),
    ).toMatch(/Report-Only/);
    expect(
      checkPublicHeaders(get({ ...good, "content-security-policy": "default-src 'self'" })).join(),
    ).toMatch(/frame-ancestors/);
  });
  it("refuse HSTS court, nosniff manquant, Referrer-Policy manquant", () => {
    const p = checkPublicHeaders(
      get({
        ...good,
        "strict-transport-security": "max-age=60",
        "x-content-type-options": "",
        "referrer-policy": "",
      }),
    ).join();
    expect(p).toMatch(/HSTS/);
    expect(p).toMatch(/nosniff/);
    expect(p).toMatch(/Referrer-Policy/);
  });
  it("cache immutable d'un an", () => {
    expect(isImmutableYear("public, max-age=31536000, immutable")).toBe(true);
    expect(isImmutableYear("public, max-age=0, must-revalidate")).toBe(false);
    expect(isImmutableYear("public, max-age=3600, immutable")).toBe(false);
    expect(isImmutableYear(null)).toBe(false);
  });
});

describe("CSP", () => {
  it("parseCsp et cspAllowsHost", () => {
    const csp =
      "default-src 'self'; frame-src https://soleana-studio.pelli.io https://*.exemple.fr";
    expect(parseCsp(csp)["frame-src"]).toHaveLength(2);
    expect(cspAllowsHost(csp, "frame-src", "soleana-studio.pelli.io")).toBe(true);
    expect(cspAllowsHost(csp, "frame-src", "a.exemple.fr")).toBe(true);
    expect(cspAllowsHost(csp, "frame-src", "evil.example")).toBe(false);
    expect(cspAllowsHost("default-src 'self'", "frame-src", "soleana-studio.pelli.io")).toBe(false);
  });
});

describe("sitemap, Pelli, admin", () => {
  it("parseSitemap lit les <loc>", () => {
    expect(
      parseSitemap(
        "<urlset><url><loc>https://a/</loc></url><url><loc> https://a/b </loc></url></urlset>",
      ),
    ).toEqual(["https://a/", "https://a/b"]);
  });
  it("findPelli repère les liens et iframes Pelli", () => {
    expect(findPelli('<a href="https://soleana-studio.pelli.io/booking/x">r</a>')).toEqual({
      found: true,
      hosts: ["soleana-studio.pelli.io"],
    });
    expect(findPelli('<a href="https://autre.fr">r</a>').found).toBe(false);
  });
  it("adminLeaks repère des mots sensibles", () => {
    expect(adminLeaks("<html>Soleana Studio Admin</html>")).toEqual([]);
    expect(adminLeaks('{"access_token":"x","internal_note":"y"}')).toEqual([
      "internal_note",
      "access_token",
    ]);
  });
  it("endsAtLogin : la chaîne doit finir sur la connexion, pas sur une page d'admin", () => {
    const hops = [
      { status: 307, path: "/admin" },
      { status: 307, path: "/admin/dashboard" },
      { status: 200, path: "/admin/login" },
    ];
    expect(endsAtLogin(hops, "<h1>Soleana Studio Admin</h1>")).toBe(true);
    expect(endsAtLogin(hops, "<h1>Tableau de bord</h1> Soleana Studio Admin")).toBe(false);
    expect(endsAtLogin([{ status: 200, path: "/admin/dashboard" }], "Soleana Studio Admin")).toBe(
      false,
    );
    expect(endsAtLogin([{ status: 307, path: "/admin" }], "")).toBe(false);
    expect(endsAtLogin([], "")).toBe(false);
  });
  it("renderTable affiche OK / KO", () => {
    const t = renderTable([
      { group: "pages", name: "/", ok: true, detail: "HTTP 200" },
      { group: "pages", name: "/x", ok: false, detail: "HTTP 500" },
    ]);
    expect(t).toMatch(/^OK {2}pages/);
    expect(t).toMatch(/\nKO {2}pages/);
  });
});
