import { describe, expect, it } from "vitest";
import {
  datesChange,
  datesChangeConfirmation,
  galleryStatsFrom,
  isPelliUrl,
  publishWarnings,
  type GalleryStats,
} from "./publish-checks";
import { bookingUrlProblem, validateEventDraft, type EventFormValues } from "./validation";

const base: EventFormValues = {
  title: "Mini-séances de Noël 2026",
  slug: "mini-seances-noel-2026",
  subtitle: "",
  description: "Texte",
  location: "Plan-d'Aups-Sainte-Baume",
  edition_label: "",
  experience_steps: [],
  closing_title: "",
  event_dates: ["2026-11-07", "2026-11-11"],
  fallback_dates: ["2026-11-14"],
  availability_note: "",
  formules: [],
  faq: [],
  booking_url: "https://soleana-studio.pelli.io/booking/noel",
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
  theme: "warm",
  accent_color: "",
  icon_main: "star",
  icon_bullet: "check",
  display_order: 0,
};
const now = new Date("2026-11-01T10:00:00Z");
const stats = (over: Partial<GalleryStats> = {}): GalleryStats => ({
  galleries: 2,
  emptyGalleries: [],
  photosWithoutAlt: 0,
  hiddenPhotos: 0,
  ...over,
});

describe("isPelliUrl / bookingUrlProblem", () => {
  it("accepte les liens Pelli en https", () => {
    expect(isPelliUrl("https://soleana-studio.pelli.io/booking/x?month=2026-11")).toBe(true);
    expect(isPelliUrl("https://autre.pelli.io/x")).toBe(true);
    expect(bookingUrlProblem("https://soleana-studio.pelli.io/booking/x")).toBeNull();
  });
  it.each([
    "http://soleana-studio.pelli.io/x",
    "https://evil.example/pelli.io",
    "https://pelli.io.evil.example/x",
    "https://soleana-studio.pelli.io@evil.example/x",
    "https://user:pw@soleana-studio.pelli.io/x",
    "soleana-studio.pelli.io/x",
    "javascript:alert(1)",
  ])("refuse %s", (url) => {
    expect(isPelliUrl(url)).toBe(false);
    expect(bookingUrlProblem(url)).toBeTruthy();
  });
  it("distingue un lien invalide d'un lien qui ne vient pas de Pelli", () => {
    expect(bookingUrlProblem("pelli")).toMatch(/https/);
    expect(bookingUrlProblem("https://evil.example/x")).toMatch(/ne vient pas de Pelli/);
  });
  it("validateEventDraft applique la règle au lien de l'événement et à celui des formules", () => {
    expect(
      validateEventDraft({ ...base, booking_url: "https://evil.example/x" }).booking_url,
    ).toMatch(/Pelli/);
    const withFormule = {
      ...base,
      formules: [
        {
          name: "A",
          price_eur: 10,
          features: [],
          booking_url: "https://evil.example/x",
          featured: false,
        },
      ],
    };
    expect(validateEventDraft(withFormule)["formules.0.booking_url"]).toMatch(/Pelli/);
  });
});

describe("publishWarnings", () => {
  const ok = { hasCover: true, galleryStats: stats(), now };
  it("aucun avertissement pour un événement complet", () => {
    expect(publishWarnings({ ...base, event_dates: ["2026-11-28", "2026-11-29"] }, ok)).toEqual([]);
  });
  it("prévient sans bloquer : pas de couverture, pas de lieu", () => {
    const w = publishWarnings(
      { ...base, location: " ", event_dates: ["2026-11-28"] },
      { ...ok, hasCover: false },
    );
    expect(w).toHaveLength(2);
    expect(w[0]).toMatch(/image de couverture/);
    expect(w[1]).toMatch(/lieu/);
  });
  it("prévient quand toutes les dates sont passées (dates de report comprises)", () => {
    const w = publishWarnings(
      { ...base, event_dates: ["2026-10-01"], fallback_dates: ["2026-10-08"] },
      ok,
    );
    expect(w.join()).toMatch(/dates sont passées/);
    const later = publishWarnings(
      { ...base, event_dates: ["2026-10-01"], fallback_dates: ["2026-12-08"] },
      ok,
    );
    expect(later.join()).not.toMatch(/passées/);
  });
  it("galeries vides et photos sans description, au singulier et au pluriel", () => {
    const one = publishWarnings(
      { ...base, event_dates: ["2026-11-28"] },
      { ...ok, galleryStats: stats({ emptyGalleries: ["Décor"], photosWithoutAlt: 1 }) },
    );
    expect(one.join("|")).toMatch(/La galerie « Décor » est vide/);
    expect(one.join("|")).toMatch(/1 photo n'a pas de description/);
    const many = publishWarnings(
      { ...base, event_dates: ["2026-11-28"] },
      { ...ok, galleryStats: stats({ emptyGalleries: ["A", "B"], photosWithoutAlt: 3 }) },
    );
    expect(many.join("|")).toMatch(/Les galeries « A », « B » sont vides/);
    expect(many.join("|")).toMatch(/3 photos n'ont pas de description/);
  });
  it("ne dit rien des galeries quand elles ne sont pas disponibles", () => {
    expect(
      publishWarnings({ ...base, event_dates: ["2026-11-28"] }, { ...ok, galleryStats: null }),
    ).toEqual([]);
  });
});

describe("changement de dates (cas Noël 2026 : du 7 et 11 au 28 et 29 novembre)", () => {
  const after = {
    ...base,
    event_dates: ["2026-11-28", "2026-11-29"],
    fallback_dates: ["2026-12-05", "2026-12-06"],
  };
  it("détecte les dates ajoutées, retirées et le changement des dates de report", () => {
    expect(datesChange(base, after)).toEqual({
      changed: true,
      added: ["2026-11-28", "2026-11-29"],
      removed: ["2026-11-07", "2026-11-11"],
      fallbackChanged: true,
    });
  });
  it("ne signale rien quand seul l'ordre ou un autre champ change", () => {
    expect(
      datesChange(base, { ...base, event_dates: ["2026-11-11", "2026-11-07"], title: "Autre" })
        .changed,
    ).toBe(false);
  });
  it("la confirmation annonce la nouvelle date affichée", () => {
    const text = datesChangeConfirmation(base, after);
    expect(text).toMatch(/déjà publié/);
    expect(text).toMatch(/Samedi 28 et dimanche 29 novembre/);
    expect(datesChangeConfirmation(base, base)).toBeNull();
  });
  it("retirer toutes les dates est signalé", () => {
    expect(datesChangeConfirmation(base, { ...base, event_dates: [] })).toMatch(/aucune date/);
  });
});

describe("galleryStatsFrom", () => {
  const defs = [
    { slot: "galerie-1", title: "Famille" },
    { slot: "galerie-2", title: "Décor" },
  ];
  it("compte galeries vides, photos sans description et photos masquées", () => {
    const photos = [
      { slot: "galerie-1", alt: "Une famille", published: true },
      { slot: "galerie-1", alt: "  ", published: false },
    ];
    expect(galleryStatsFrom(defs, photos)).toEqual({
      galleries: 2,
      emptyGalleries: ["Décor"],
      photosWithoutAlt: 1,
      hiddenPhotos: 1,
    });
  });
  it("événement sans galerie : rien à signaler", () => {
    expect(galleryStatsFrom([], [])).toEqual({
      galleries: 0,
      emptyGalleries: [],
      photosWithoutAlt: 0,
      hiddenPhotos: 0,
    });
  });
  it("une photo placée dans une galerie inconnue ne rend pas une autre galerie « non vide »", () => {
    expect(
      galleryStatsFrom(defs, [{ slot: "ancienne", alt: "x", published: true }]).emptyGalleries,
    ).toEqual(["Famille", "Décor"]);
  });
});
