import { describe, expect, it } from "vitest";
import { validateNewPassword, validatePasswordConfirmation } from "./password-rules";

const EMAIL = "admin@soleana.studio";

describe("validateNewPassword", () => {
  it("accepte un mot de passe valide", () => {
    expect(validateNewPassword("UnAutreMotDePasse2", { email: EMAIL })).toBeNull();
  });

  it("refuse un mot de passe trop court", () => {
    expect(validateNewPassword("Court1", { email: EMAIL })).toBe(
      "Le mot de passe doit contenir au moins 12 caractères.",
    );
  });

  it("ne compare pas au mot de passe actuel : cette règle vit côté serveur (same_password)", () => {
    // Voir change-password.ts : comparer ici comparerait à une valeur pas encore vérifiée.
    expect(validateNewPassword("MotDePasseActuel1", { email: EMAIL })).toBeNull();
  });
});

describe("validatePasswordConfirmation", () => {
  it("refuse une confirmation différente du nouveau mot de passe", () => {
    expect(validatePasswordConfirmation("UnAutreMotDePasse2", "Different3")).toBe(
      "Les deux mots de passe ne correspondent pas.",
    );
  });

  it("accepte une confirmation identique au nouveau mot de passe", () => {
    expect(validatePasswordConfirmation("UnAutreMotDePasse2", "UnAutreMotDePasse2")).toBeNull();
  });
});
