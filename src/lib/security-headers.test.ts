import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, isAdminPath, securityHeadersFor } from "./security-headers";

describe("securityHeadersFor", () => {
  it("applique la CSP bloquante sur les pages publiques", () => {
    const h = securityHeadersFor("/photographe-couple-marseille");
    expect(h["Content-Security-Policy"]).toBe(CONTENT_SECURITY_POLICY);
    expect(h["Content-Security-Policy-Report-Only"]).toBeUndefined();
  });
  it("garde le simple rapport sur /admin (envoi de photos non testé en navigateur)", () => {
    for (const path of ["/admin", "/admin/login", "/admin/photos"]) {
      const h = securityHeadersFor(path);
      expect(h["Content-Security-Policy-Report-Only"]).toBe(
        CONTENT_SECURITY_POLICY.replace("; upgrade-insecure-requests", ""),
      );
      expect(h["Content-Security-Policy-Report-Only"]).not.toContain("upgrade-insecure-requests");
      expect(h["Content-Security-Policy"]).toBeUndefined();
    }
  });
  it("ne confond pas /administration avec /admin", () => {
    expect(isAdminPath("/administration")).toBe(false);
    expect(isAdminPath("/admin-x")).toBe(false);
  });
  it("envoie les en-têtes de base sur toutes les réponses", () => {
    const h = securityHeadersFor("/");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });
  it("la politique est restrictive : pas d'ancien hôte, pas de wildcard, cadres et objets fermés", () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain("hvfvvbiupyzoounzyqoz");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/\*|https:(?!\/\/)/);
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
  });
});
