import { describe, expect, it } from "vitest";
import { safeJsonLd } from "./seo";

describe("safeJsonLd", () => {
  const hostile = {
    name: "Noël </script><img src=x onerror=alert(1)>",
    note: "A & B \u2028 \u2029 <!-- -->",
  };

  it("ne contient ni balise fermante ni chevron brut", () => {
    const out = safeJsonLd(hostile);
    expect(out).not.toMatch(/[<>&]/);
    expect(out.toLowerCase()).not.toContain("</script");
    expect(out).not.toMatch(/[\u2028\u2029]/);
  });
  it("reste du JSON valide qui redonne exactement les mêmes données", () => {
    expect(JSON.parse(safeJsonLd(hostile))).toEqual(hostile);
  });
  it("laisse un contenu ordinaire inchangé", () => {
    const plain = { "@type": "Event", name: "Mini-séances de Noël", price: 45 };
    expect(safeJsonLd(plain)).toBe(JSON.stringify(plain));
  });
});
