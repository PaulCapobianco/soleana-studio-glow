// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { legacyNoelEvent } from "@/lib/events/legacy-noel";
import type { EventRow } from "@/lib/events/types";
import * as galleryAdmin from "@/lib/events/gallery-admin";
import * as upload from "@/lib/photos/event-upload";
import { DuplicateEventDialog } from "./admin/DuplicateEventDialog";
import { EventGalleriesAdmin } from "./admin/EventGalleriesAdmin";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("DuplicateEventDialog", () => {
  afterEach(() => cleanup());
  it("propose trois choix, « sans galeries » par défaut, et transmet le choix", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <DuplicateEventDialog
        eventTitle="Noël 2026"
        busy={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(
      (screen.getByRole("radio", { name: /Sans les galeries/ }) as HTMLInputElement).checked,
    ).toBe(true);
    await user.click(screen.getByRole("radio", { name: /édition précédente/ }));
    await user.click(screen.getByRole("button", { name: "Dupliquer" }));
    expect(onConfirm).toHaveBeenCalledWith("reference");
  });
  it("Annuler ne crée rien", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DuplicateEventDialog
        eventTitle="Noël 2026"
        busy={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("EventGalleriesAdmin", () => {
  const base = {
    ...(legacyNoelEvent() as unknown as EventRow),
    id: "11111111-1111-1111-1111-111111111111",
    slug: "noel-2027",
    title: "Noël 2027",
  };
  const withGalleries = {
    ...base,
    galleries: [
      { slot: "galerie-1", title: "Famille" },
      { slot: "galerie-2", title: "Couples" },
    ],
    gallery_reference_event_id: null,
  } as unknown as EventRow;
  const placement = (id: string, slot: string, order: number) => ({
    placementId: id,
    photoId: `p-${id}`,
    slot,
    displayOrder: order,
    published: true,
    alt: `alt ${id}`,
    thumbUrl: null,
    posX: 50,
    posY: 50,
  });

  function setup(
    event: EventRow,
    tables = true,
    placements = [placement("1", "galerie-1", 0), placement("2", "galerie-1", 1)],
  ) {
    vi.spyOn(galleryAdmin, "galleryTablesAvailable").mockResolvedValue(tables);
    vi.spyOn(galleryAdmin, "listEventPlacements").mockResolvedValue(placements);
    vi.spyOn(galleryAdmin, "listOtherEvents").mockResolvedValue([
      { id: "o1", title: "Noël 2026", status: "published" },
      { id: "o2", title: "Brouillon", status: "draft" },
    ]);
    const onChange = vi.fn();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <EventGalleriesAdmin event={event} onEventChange={onChange} />
      </QueryClientProvider>,
    );
    return onChange;
  }
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("tables de photos absentes : explication claire, aucune action", async () => {
    setup(withGalleries, false);
    expect(await screen.findByText(/migration « photos »/)).toBeTruthy();
    expect(screen.queryByText("Nouvelle galerie")).toBeNull();
  });
  it("colonnes de galeries absentes : explication claire", async () => {
    setup({ ...base, galleries: undefined } as unknown as EventRow, true);
    expect(await screen.findByText(/migration « galeries d'événements »/)).toBeTruthy();
  });
  it("indique que l'affichage public n'est pas encore activé", async () => {
    setup(withGalleries);
    expect(await screen.findByText(/pas encore activé/)).toBeTruthy();
  });
  it("liste les galeries et leurs photos ; supprimer une galerie non vide est impossible", async () => {
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    await screen.findAllByLabelText("Description de la photo");
    expect(screen.getByDisplayValue("Couples")).toBeTruthy();
    const del = screen.getAllByRole("button", {
      name: "Supprimer la galerie",
    }) as HTMLButtonElement[];
    expect(del[0].disabled).toBe(true);
    expect(del[1].disabled).toBe(false);
    expect(screen.getAllByLabelText("Description de la photo")).toHaveLength(2);
  });
  it("crée une galerie avec un identifiant généré", async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(galleryAdmin, "saveGalleryDefs").mockResolvedValue(withGalleries);
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    await user.type(screen.getByLabelText(/Nouvelle galerie/), "Décor");
    await user.click(screen.getByRole("button", { name: "+ Créer la galerie" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][1]).toEqual([
      ...(withGalleries as unknown as { galleries: unknown[] }).galleries,
      { slot: "galerie-3", title: "Décor" },
    ]);
  });
  it("envoie plusieurs photos dans la bonne galerie, à la suite, sans catégorie", async () => {
    const user = userEvent.setup();
    const up = vi
      .spyOn(upload, "uploadEventPhoto")
      .mockResolvedValue({ photoId: "n", warning: null });
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    const files = [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.jpg", { type: "image/jpeg" }),
    ];
    await user.upload(screen.getByLabelText("Ajouter des photos à la galerie Famille"), files);
    await waitFor(() => expect(up).toHaveBeenCalledTimes(2));
    expect(up.mock.calls.map((c) => [c[0].slot, c[0].displayOrder, c[0].eventSlug])).toEqual([
      ["galerie-1", 2, "noel-2027"],
      ["galerie-1", 3, "noel-2027"],
    ]);
    expect(up.mock.calls[0][0].alt).toBe("Famille — Noël 2027");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("2 photos ajoutées."));
  });
  it("règle le cadrage d'une photo existante et l'enregistre", async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(galleryAdmin, "setPlacementFraming").mockResolvedValue();
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    expect(screen.queryByText("Enregistrer le cadrage")).toBeNull();
    const slider = (await screen.findAllByLabelText("Cadrage horizontal"))[0];
    fireEvent.change(slider, { target: { value: "20" } });
    await user.click(screen.getByText("Enregistrer le cadrage"));
    await waitFor(() => expect(save).toHaveBeenCalledWith("1", 20, 50));
  });
  it("une photo qui échoue est signalée sans bloquer les autres", async () => {
    const user = userEvent.setup();
    const up = vi
      .spyOn(upload, "uploadEventPhoto")
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ photoId: "n", warning: null });
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    await user.upload(screen.getByLabelText("Ajouter des photos à la galerie Famille"), [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.jpg", { type: "image/jpeg" }),
    ]);
    await waitFor(() => expect(up).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("a.jpg")));
    expect(toast.success).toHaveBeenCalledWith("1 photo ajoutée.");
  });
  it("retire une photo après confirmation, masque, réordonne", async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(galleryAdmin, "removePlacement").mockResolvedValue();
    const publish = vi.spyOn(galleryAdmin, "setPlacementPublished").mockResolvedValue();
    const move = vi.spyOn(galleryAdmin, "movePlacement").mockResolvedValue();
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    await screen.findAllByLabelText("Description de la photo");
    const card = screen.getByRole("region", { name: "Galerie Famille" });
    await user.click(within(card).getAllByRole("button", { name: "Retirer" })[0]);
    await waitFor(() => expect(remove).toHaveBeenCalledWith("1"));
    await user.click(within(card).getAllByRole("button", { name: "Masquer" })[1]);
    await waitFor(() => expect(publish).toHaveBeenCalledWith("2", false));
    await user.click(within(card).getAllByRole("button", { name: "Photo suivante" })[0]);
    await waitFor(() => expect(move).toHaveBeenCalled());
    expect(move.mock.calls[0].slice(1)).toEqual(["1", 1]);
  });
  it("choisit une autre édition à afficher par référence", async () => {
    const user = userEvent.setup();
    const ref = vi.spyOn(galleryAdmin, "saveGalleryReference").mockResolvedValue(withGalleries);
    setup(withGalleries);
    await screen.findByDisplayValue("Famille");
    await screen.findByRole("option", { name: "Noël 2026" });
    expect(screen.getByRole("option", { name: /Brouillon \(non publié/ })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/autre édition/), "o1");
    await waitFor(() => expect(ref).toHaveBeenCalledWith(base.id, "o1"));
  });
});
