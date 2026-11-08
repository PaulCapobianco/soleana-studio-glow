import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildAppearance } from "@/lib/events/appearance";
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

const app = (e: EventContent) => buildAppearance(e);
const noLink: EventContent = { ...fromDb, formules: [], booking_url: null };
const oneLink: EventContent = {
  ...fromDb,
  formules: [],
  booking_url: "https://soleana-studio.pelli.io/booking/x",
};

describe("EventPageContent", () => {
  it("événement de la base : couverture, dates et formules, sans galerie ni photos de Noël", () => {
    const html = renderToString(
      <EventPageContent event={fromDb} isOver={false} appearance={app(fromDb)} />,
    );
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
      <EventPageContent event={noLink} isOver={false} appearance={app(noLink)} />,
    );
    expect(html).not.toContain('href="#formules"');
    expect(html).not.toContain("Réserver cette formule");
  });

  it("lien unique à la place des formules", () => {
    const html = renderToString(
      <EventPageContent event={oneLink} isOver={false} appearance={app(oneLink)} />,
    );
    expect(html).toContain('href="https://soleana-studio.pelli.io/booking/x"');
  });

  it("édition terminée : message de remerciement, plus de formules", () => {
    const html = renderToString(
      <EventPageContent event={fromDb} isOver appearance={app(fromDb)} />,
    );
    expect(html).toContain("Édition terminée");
    expect(html).not.toContain("Douceur de Noël");
  });

  it("Noël 2026 : garde ses photos et sa galerie", () => {
    const html = renderToString(
      <EventPageContent
        event={legacyNoelEvent()}
        isOver={false}
        appearance={app(legacyNoelEvent())}
      />,
    );
    expect(html).toContain("noel-hero-a");
    expect(html).toContain("Samedi 28 et dimanche 29 novembre");
  });
});

describe("apparence", () => {
  it("thème par défaut : mêmes variables que le Noël d'avant (bordeaux, or, or clair)", () => {
    const html = renderToString(
      <EventPageContent event={fromDb} isOver={false} appearance={app(fromDb)} />,
    );
    expect(html).toContain("--noel-burgundy:#5E1112");
    expect(html).toContain("--noel-gold:#C6966F");
    expect(html).toContain("--noel-gold-text:#E3C4A4");
    expect(html).not.toContain("bulletIcon"); // puces d'origine
  });
  it("autre thème et accent personnalisé : variables posées dans le HTML serveur (pas de flash)", () => {
    const event = { ...fromDb, theme: "hiver", accent_color: "#C9A24B" };
    const html = renderToString(
      <EventPageContent event={event} isOver={false} appearance={app(event)} />,
    );
    expect(html).toContain("--noel-burgundy:#1F3A5F");
    expect(html).toContain("--noel-gold:#C9A24B");
  });
  it("icône principale et icône des puces choisies", () => {
    const event = { ...fromDb, icon_main: "snowflake", icon_bullet: "check" };
    const html = renderToString(
      <EventPageContent event={event} isOver={false} appearance={app(event)} />,
    );
    expect(html).toContain("bulletIcon");
    expect(html).toContain('d="m10 20-1.25-2.5L6 18"'); // tracé du flocon
  });
  it("une couleur d'accent illisible enregistrée est ignorée à l'affichage", () => {
    const event = { ...fromDb, accent_color: "#000000" };
    const html = renderToString(
      <EventPageContent event={event} isOver={false} appearance={app(event)} />,
    );
    expect(html).toContain("--noel-gold:#C6966F");
  });
});
