import { describe, expect, it } from "vitest";
import { ADMIN_MOBILE_CSS } from "./mobile-css";

describe("ADMIN_MOBILE_CSS", () => {
  it("empêche le zoom de Safari iOS : champs à 16 px sur mobile, sans toucher aux cases ni curseurs", () => {
    expect(ADMIN_MOBILE_CSS).toMatch(/max-width: 767px[\s\S]*font-size: 16px/);
    expect(ADMIN_MOBILE_CSS).toContain(
      'input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"])',
    );
  });
  it("garantit des cibles tactiles de 44 px sans élargir les interrupteurs Radix", () => {
    expect(ADMIN_MOBILE_CSS).toMatch(/pointer: coarse[\s\S]*min-height: 44px/);
    expect(ADMIN_MOBILE_CSS).toContain(':not([role="checkbox"], [role="switch"])');
  });
  it("reste limité à l'administration", () => {
    const selectors = ADMIN_MOBILE_CSS.match(/^\s*\.[a-z-]+/gm) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) expect(s.trim()).toBe(".admin-root");
  });
});
