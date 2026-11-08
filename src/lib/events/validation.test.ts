import { describe, expect, it } from "vitest";
import {
  isValidBookingUrl,
  slugify,
  validateEventDraft,
  validateEventForPublish,
  type EventFormValues,
} from "./validation";

const valid: EventFormValues = {
  title: "Mini-séances de printemps 2027",
  slug: "mini-seances-printemps-2027",
  subtitle: "Une parenthèse",
  description: "Texte de présentation",
  location: "Aubagne",
  edition_label: "",
  experience_steps: [],
  closing_title: "",
  event_dates: ["2027-04-10", "2027-04-11"],
  fallback_dates: ["2027-04-17"],
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
  booking_url: "",
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
  accent_color: "",
  icon_main: "etoile-noel",
  icon_bullet: "defaut",
  display_order: 0,
};

describe("isValidBookingUrl", () => {
  it("n'accepte que des liens https avec un vrai domaine", () => {
    expect(isValidBookingUrl("https://soleana-studio.pelli.io/booking/x?a=1")).toBe(true);
    expect(isValidBookingUrl("http://soleana-studio.pelli.io")).toBe(false);
    expect(isValidBookingUrl("javascript:alert(1)")).toBe(false);
    expect(isValidBookingUrl("https://user:pass@pelli.io")).toBe(false);
    expect(isValidBookingUrl("https://localhost")).toBe(false);
    expect(isValidBookingUrl("pelli.io/booking")).toBe(false);
  });
});

describe("slugify", () => {
  it("retire accents, ponctuation et tirets superflus", () => {
    expect(slugify("Le Noël de Léa 2027 !")).toBe("le-noel-de-lea-2027");
    expect(slugify("  --Été  ")).toBe("ete");
  });
});

describe("validateEventDraft", () => {
  it("accepte un événement complet", () => {
    expect(validateEventDraft(valid)).toEqual({});
  });
  it("accepte un brouillon incomplet", () => {
    expect(
      validateEventDraft({ ...valid, event_dates: [], formules: [], description: "" }),
    ).toEqual({});
  });
  it("exige titre et adresse de page valides", () => {
    const errors = validateEventDraft({ ...valid, title: " ", slug: "Noël 2027" });
    expect(errors.title).toBeTruthy();
    expect(errors.slug).toBeTruthy();
  });
  it("refuse les dates incohérentes", () => {
    expect(
      validateEventDraft({ ...valid, event_dates: ["2027-04-10", "2027-04-10"] }).event_dates,
    ).toBeTruthy();
    expect(validateEventDraft({ ...valid, event_dates: ["2027-02-30"] }).event_dates).toBeTruthy();
    expect(
      validateEventDraft({ ...valid, fallback_dates: ["2027-04-10"] }).fallback_dates,
    ).toBeTruthy();
    expect(
      validateEventDraft({ ...valid, fallback_dates: ["2027-04-03"] }).fallback_dates,
    ).toBeTruthy();
  });
  it("refuse un lien de réservation invalide, formule par formule", () => {
    const errors = validateEventDraft({
      ...valid,
      formules: [{ ...valid.formules[0], booking_url: "pelli" }],
    });
    expect(errors["formules.0.booking_url"]).toBeTruthy();
  });
  it("refuse un prix manquant ou négatif", () => {
    expect(
      validateEventDraft({ ...valid, formules: [{ ...valid.formules[0], price_eur: null }] })[
        "formules.0.price_eur"
      ],
    ).toBeTruthy();
    expect(
      validateEventDraft({ ...valid, formules: [{ ...valid.formules[0], price_eur: -5 }] })[
        "formules.0.price_eur"
      ],
    ).toBeTruthy();
  });
});

describe("validateEventForPublish", () => {
  it("accepte un événement prêt", () => {
    expect(validateEventForPublish(valid)).toEqual({});
  });
  it("exige une date, une présentation et un moyen de réserver", () => {
    const errors = validateEventForPublish({
      ...valid,
      event_dates: [],
      description: "",
      formules: [],
      booking_url: "",
    });
    expect(errors.event_dates).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.booking_url).toBeTruthy();
  });
  it("accepte un lien unique à la place des formules", () => {
    expect(
      validateEventForPublish({
        ...valid,
        formules: [],
        booking_url: "https://soleana-studio.pelli.io/booking/x",
      }),
    ).toEqual({});
  });
  it("exige le lien de chaque formule", () => {
    const errors = validateEventForPublish({
      ...valid,
      formules: [{ ...valid.formules[0], booking_url: "" }],
    });
    expect(errors["formules.0.booking_url"]).toBeTruthy();
  });
  it("exige un texte de teaser si le teaser est activé", () => {
    expect(validateEventForPublish({ ...valid, show_teaser: true }).teaser_text).toBeTruthy();
  });
});

describe("apparence", () => {
  it("accepte le thème par défaut, un autre thème, une icône connue", () => {
    expect(
      validateEventDraft({
        ...valid,
        theme: "hiver",
        icon_main: "snowflake",
        icon_bullet: "check",
      }),
    ).toEqual({});
  });
  it("refuse un thème ou une icône inconnus", () => {
    const errors = validateEventDraft({
      ...valid,
      theme: "rose-bonbon",
      icon_main: "skull",
      icon_bullet: "x",
    });
    expect(errors.theme).toBeTruthy();
    expect(errors.icon_main).toBeTruthy();
    expect(errors.icon_bullet).toBeTruthy();
  });
  it("accepte une couleur d'accent lisible", () => {
    expect(validateEventDraft({ ...valid, accent_color: "#C9A24B" })).toEqual({});
  });
  it("bloque une couleur d'accent illisible ou mal écrite", () => {
    expect(validateEventDraft({ ...valid, accent_color: "#000000" }).accent_color).toMatch(
      /sombre/,
    );
    expect(validateEventDraft({ ...valid, accent_color: "#FFFFFF" }).accent_color).toMatch(
      /claire/,
    );
    expect(validateEventDraft({ ...valid, accent_color: "rouge" }).accent_color).toBeTruthy();
  });
});
