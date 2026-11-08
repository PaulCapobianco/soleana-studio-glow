// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import * as admin from "@/lib/events/admin";
import type { EventRow } from "@/lib/events/types";
import { EventEditor } from "./EventEditor";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useBlocker: vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const draft: EventRow = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "mini-seances-printemps-2027",
  title: "Mini-séances de printemps 2027",
  subtitle: "Une parenthèse fleurie",
  description: "Présentation de l'événement.",
  location: "Aubagne",
  edition_label: "",
  experience_steps: [],
  closing_title: "",
  event_dates: ["2027-04-10"],
  fallback_dates: [],
  availability_note: "",
  formules: [
    {
      name: "Formule unique",
      price_eur: 90,
      features: ["10 photos"],
      booking_url: "https://soleana-studio.pelli.io/booking/printemps",
      featured: false,
    },
  ],
  faq: [],
  booking_url: null,
  cover_image_url: null,
  cover_image_small_url: null,
  cover_image_alt: "",
  ended_title: "",
  ended_text: "",
  show_teaser: false,
  teaser_title: "",
  teaser_text: "",
  teaser_cta: "",
  meta_title: "",
  meta_description: "",
  og_title: "",
  og_description: "",
  theme: "noel-classique",
  accent_color: null,
  icon_main: "etoile-noel",
  icon_bullet: "defaut",
  status: "draft",
  first_published_at: null,
  display_order: 0,
  created_at: "2026-11-06T10:00:00Z",
  updated_at: "2026-11-06T10:00:00Z",
};

function renderEditor(row: EventRow = draft) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <EventEditor initial={row} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => cleanup());

describe("EventEditor", () => {
  it("affiche la fiche d'un brouillon avec ses actions", () => {
    renderEditor();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(draft.title);
    expect(screen.getByRole("button", { name: "Publier" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Supprimer ce brouillon" })).toBeTruthy(); // brouillon jamais publié
    expect(screen.queryByRole("button", { name: "Dépublier" })).toBeNull();
    expect((screen.getByLabelText(/Adresse de la page/) as HTMLInputElement).readOnly).toBe(false);
  });

  it("Enregistrer n'est actif qu'après une modification, puis envoie les valeurs nettoyées", async () => {
    const user = userEvent.setup();
    const saved = { ...draft, title: "Nouveau titre" };
    const spy = vi.spyOn(admin, "saveEvent").mockResolvedValue(saved);
    renderEditor();

    const save = screen.getByRole("button", { name: "Enregistrer" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const title = screen.getByLabelText("Titre", { selector: "input" });
    await user.clear(title);
    await user.type(title, "  Nouveau titre  ");
    expect(save.disabled).toBe(false);
    await user.click(save);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][1]).toMatchObject({
      title: "Nouveau titre",
      event_dates: ["2027-04-10"],
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("bloque l'enregistrement et explique l'erreur quand un lien est invalide", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(admin, "saveEvent");
    renderEditor();

    const link = screen.getByLabelText("Lien de réservation");
    await user.clear(link);
    await user.type(link, "pelli");
    expect(screen.getByRole("alert").textContent).toMatch(/https:\/\//);

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(spy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/lien n'est pas valide/));
  });

  it("refuse de publier sans date et dit pourquoi, sans rien envoyer", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(admin, "saveEvent");
    renderEditor({ ...draft, event_dates: [] });

    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(spy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/au moins une date/));
  });

  it("publie après confirmation et passe en « Publié »", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(admin, "saveEvent").mockResolvedValue({
      ...draft,
      status: "published",
      first_published_at: "2026-11-06T11:00:00Z",
    });
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Publier" }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][2]).toBe("published");
    await waitFor(() => expect(screen.getByRole("button", { name: "Dépublier" })).toBeTruthy());
    // slug figé après la première publication
    expect((screen.getByLabelText(/Adresse de la page/) as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByRole("button", { name: "Supprimer ce brouillon" })).toBeNull();
  });

  it("ne publie pas si la personne annule la confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const spy = vi.spyOn(admin, "saveEvent");
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("ajoute et retire une date, et montre le libellé tel qu'affiché sur le site", async () => {
    const user = userEvent.setup();
    renderEditor();
    expect(screen.getByText("Samedi 10 avril 2027")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "+ Ajouter une date" }));
    expect(screen.getAllByLabelText(/Dates des séances/)).toHaveLength(2);
    const retirer = screen.getAllByRole("button", { name: "Retirer" });
    await user.click(retirer[retirer.length - 1]);
    expect(screen.getAllByLabelText(/Dates des séances/)).toHaveLength(1);
  });

  it("l'aperçu montre la page avec les valeurs en cours de saisie", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Aperçu" }));
    const preview = screen.getByText(/Aperçu \(avec vos modifications/).parentElement!
      .parentElement!;
    expect(within(preview).getByRole("heading", { level: 1 }).textContent).toBe(draft.title);
    expect(within(preview).getByText("Formule unique")).toBeTruthy();
  });

  it("un événement publié prévient que les enregistrements sont immédiats", () => {
    renderEditor({ ...draft, status: "published", first_published_at: "2026-11-01T00:00:00Z" });
    expect(screen.getByText(/chaque enregistrement est visible tout de/)).toBeTruthy();
  });

  it("Apparence : choisir un thème et une icône est enregistré tel quel", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(admin, "saveEvent").mockResolvedValue({ ...draft, theme: "hiver" });
    renderEditor();

    await user.click(screen.getByRole("radio", { name: /Hiver givré/ }));
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Icône principale" })).getByRole("radio", {
        name: "Flocon",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][1]).toMatchObject({
      theme: "hiver",
      icon_main: "snowflake",
      accent_color: null,
    });
  });

  it("Apparence : une couleur d'accent illisible bloque l'enregistrement et propose une nuance", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(admin, "saveEvent");
    renderEditor();

    await user.click(screen.getByLabelText(/Personnaliser la couleur d'accent/));
    const code = screen.getByLabelText("Code de la couleur d'accent");
    await user.clear(code);
    await user.type(code, "#3A0A0B");
    expect(screen.getByText(/trop sombre/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Utiliser une nuance lisible/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(spy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Utiliser une nuance lisible/ }));
    expect(screen.getByText(/bien lisible/)).toBeTruthy();
  });
});
