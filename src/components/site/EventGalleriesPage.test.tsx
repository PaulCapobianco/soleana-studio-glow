import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildAppearance } from "@/lib/events/appearance";
import type { EventGalleryGroup } from "@/lib/events/galleries";
import { legacyNoelEvent } from "@/lib/events/legacy-noel";
import { EventPageContent } from "./EventPage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

/** Rendu serveur complet (attend les parties chargées à la demande), comme le fait le site. */
function html(node: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const out = new PassThrough();
    let text = "";
    out.on("data", (chunk) => (text += chunk));
    out.on("end", () => resolve(text));
    const stream = renderToPipeableStream(node, {
      onAllReady: () => stream.pipe(out),
      onError: reject,
    });
  });
}

const photo = (id: string) => ({
  id,
  image_url: `https://cdn/${id}-1600.webp`,
  srcset: "",
  avif_srcset: `https://cdn/${id}-400.avif 400w, https://cdn/${id}-1600.avif 1600w`,
  webp_srcset: `https://cdn/${id}-400.webp 400w, https://cdn/${id}-1600.webp 1600w`,
  alt_text: `alt ${id}`,
  location: null,
  title: null,
  display_order: 0,
  object_position: "50% 50%",
  width: 1600,
  height: 1067,
});
const groups: EventGalleryGroup[] = [
  {
    previousEdition: null,
    galleries: [{ slot: "galerie-1", title: "Famille", photos: [photo("a"), photo("b")] }],
  },
  {
    previousEdition: { title: "Noël 2025", slug: "noel-2025" },
    galleries: [{ slot: "x", title: "Couples", photos: [photo("c")] }],
  },
];

describe("galeries d'événement dans la page", () => {
  const noel = legacyNoelEvent();
  const render1 = (g: EventGalleryGroup[], event = noel) =>
    html(
      <EventPageContent
        event={event}
        isOver={false}
        appearance={buildAppearance(event)}
        galleryGroups={g}
      />,
    );

  it("sans galerie en base : le comportement d'avant (galerie de Noël fournie avec le site)", async () => {
    const html = await render1([]);
    expect(html).toContain("Photos des mini-séances de Noël");
    expect(html).not.toContain("Galerie photos");
  });
  it("avec des galeries en base : vignettes AVIF + WebP, titre et nombre, à la place de la galerie d'origine", async () => {
    const html = await render1(groups);
    expect(html).not.toContain("Photos des mini-séances de Noël");
    expect(html).toContain("Galerie photos");
    expect(html).toContain('type="image/avif"');
    expect(html).toContain("Famille · ");
    expect(html).toContain("2 photos");
    expect(html).toContain('width="1600"');
  });
  it("affiche « Édition précédente » avec le titre de l'autre événement", async () => {
    const html = await render1(groups);
    expect(html).toContain("Édition précédente : Noël 2025");
    expect(html).toContain("Voir cet événement");
    expect(await render1([groups[1]])).not.toContain("Galerie photos");
  });
  it("un événement sans fichiers d'origine reçoit ses galeries de la base", async () => {
    const e = { ...noel, slug: "printemps-2027" };
    expect(await render1(groups, e)).toContain("Galerie photos");
    expect(await render1([], e)).not.toContain("Galerie photos");
  });
});
