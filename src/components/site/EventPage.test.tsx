import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { legacyNoelEvent } from "@/lib/events/legacy-noel";
import type { EventContent } from "@/lib/events/types";
import { EventPageContent } from "./EventPage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

// Un événement créé depuis l'admin : pas de photos d'édition fournies avec le site.
const fromDb: EventContent = {
  ...legacyNoelEvent(),
  id: "abc",
  slug: "mini-seances-printemps-2027",
  title: "Mini-séances de printemps 2027",
  event_dates: ["2027-04-10", "2027-04-11"],
  fallback_dates: ["2027-04-17"],
  cover_image_url:
    "https://x.supabase.co/storage/v1/object/public/photos/events/abc/cover-1600.webp",
  cover_image_small_url:
    "https://x.supabase.co/storage/v1/object/public/photos/events/abc/cover-800.webp",
  cover_image_alt: "Famille dans un champ de fleurs",
};

describe("EventPageContent", () => {
  it("événement de la base : couverture, dates et formules, sans galerie ni photos de Noël", () => {
    const html = renderToString(<EventPageContent event={fromDb} isOver={false} />);
    expect(html).toContain("Mini-séances de printemps 2027");
    expect(html).toContain("cover-1600.webp 1600w");
    expect(html).toContain('alt="Famille dans un champ de fleurs"');
    expect(html).toContain("Samedi 10 avril 2027");
    expect(html).toContain("reportées au 17 avril");
    expect(html).toContain("Douceur de Noël"); // formules reprises du jeu de données de test
    expect(html).not.toContain("noel-hero");
    expect(html).not.toContain("Photos des mini-séances");
  });

  it("sans formule ni lien : pas de bouton de réservation ni de section tarifs", () => {
    const html = renderToString(
      <EventPageContent event={{ ...fromDb, formules: [], booking_url: null }} isOver={false} />,
    );
    expect(html).not.toContain('href="#formules"');
    expect(html).not.toContain("Réserver cette formule");
  });

  it("lien unique à la place des formules", () => {
    const html = renderToString(
      <EventPageContent
        event={{
          ...fromDb,
          formules: [],
          booking_url: "https://soleana-studio.pelli.io/booking/x",
        }}
        isOver={false}
      />,
    );
    expect(html).toContain('href="https://soleana-studio.pelli.io/booking/x"');
  });

  it("édition terminée : message de remerciement, plus de formules", () => {
    const html = renderToString(<EventPageContent event={fromDb} isOver />);
    expect(html).toContain("Édition terminée");
    expect(html).not.toContain("Douceur de Noël");
  });

  it("Noël 2026 : garde ses photos et sa galerie", () => {
    const html = renderToString(<EventPageContent event={legacyNoelEvent()} isOver={false} />);
    expect(html).toContain("noel-hero-a");
    expect(html).toContain("Samedi 28 et dimanche 29 novembre");
  });
});
