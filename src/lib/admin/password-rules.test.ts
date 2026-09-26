import { describe, expect, it } from "vitest";
import { validateNewPassword, validatePasswordConfirmation } from "./password-rules";

const EMAIL = "admin@soleana.studio";
const CURRENT = "MotDePasseActuel1";

describe("validateNewPassword", () => {
  it("refuse un nouveau mot de passe identique à l'actuel", () => {
    expect(validateNewPassword(CURRENT, { email: EMAIL, current: CURRENT })).toBe(
      "Le nouveau mot de passe doit être différent de l'actuel.",
    );
  });

  it("accepte un nouveau mot de passe différent de l'actuel", () => {
    expect(
      validateNewPassword("UnAutreMotDePasse2", { email: EMAIL, current: CURRENT }),
    ).toBeNull();
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
