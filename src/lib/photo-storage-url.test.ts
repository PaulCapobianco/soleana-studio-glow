import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { publicImageUrl } from "./photo-storage";

describe("publicImageUrl", () => {
  it("produit exactement l'URL que donne supabase-js, sans charger le client", () => {
    const url = import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co";
    const real = createClient(url, "public-key");
    for (const path of [
      "galleries/couple/dd39da108b84/0ac3dbfa-400.avif",
      "galleries/evenement/ab12cd34ef56/12345678-1600.webp",
      "events/0b1c2d3e-0000-4000-8000-000000000000/cover-800-1700000000000.webp",
      "galleries/avec espace/é.webp",
    ]) {
      expect(publicImageUrl(path)).toBe(
        real.storage.from("photos").getPublicUrl(path).data.publicUrl,
      );
    }
  });
});
