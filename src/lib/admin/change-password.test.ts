import { describe, expect, it, vi } from "vitest";
import { changePassword, type ChangePasswordDeps } from "./change-password";

const EMAIL = "admin@soleana.studio";
const CURRENT = "MotDePasseActuel1";
const NEXT = "UnAutreMotDePasse2";

function makeDeps(overrides: Partial<ChangePasswordDeps> = {}): ChangePasswordDeps {
  return {
    verifyCurrentPassword: vi.fn().mockResolvedValue(true),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    reauthenticate: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

const baseInput = { email: EMAIL, current: CURRENT, next: NEXT, confirm: NEXT, needsNonce: false, nonce: "" };

describe("changePassword", () => {
  it("accepte un nouveau mot de passe différent de l'actuel (aucune erreur Supabase)", async () => {
    const deps = makeDeps();
    const result = await changePassword(baseInput, deps);
    expect(result).toEqual({ status: "success" });
    expect(deps.verifyCurrentPassword).toHaveBeenCalledWith(EMAIL, CURRENT);
    expect(deps.updateUser).toHaveBeenCalledWith({ password: NEXT });
  });

  it("refuse une confirmation différente sans envoyer aucune requête", async () => {
    const deps = makeDeps();
    const result = await changePassword({ ...baseInput, confirm: "Different3" }, deps);
    expect(result).toEqual({ status: "error", message: "Les deux mots de passe ne correspondent pas." });
    expect(deps.verifyCurrentPassword).not.toHaveBeenCalled();
    expect(deps.updateUser).not.toHaveBeenCalled();
  });

  it("refuse un mot de passe actuel faux, avec un message clair, sans appeler updateUser", async () => {
    const deps = makeDeps({ verifyCurrentPassword: vi.fn().mockResolvedValue(false) });
    const result = await changePassword(baseInput, deps);
    expect(result).toEqual({ status: "wrong-current" });
    expect(deps.updateUser).not.toHaveBeenCalled();
  });

  it("refuse un nouveau mot de passe identique à l'actuel, une fois celui-ci vérifié (same_password)", async () => {
    const deps = makeDeps({
      updateUser: vi.fn().mockResolvedValue({
        error: { code: "same_password", message: "New password should be different from the old password." },
      }),
    });
    const result = await changePassword(baseInput, deps);
    expect(result).toEqual({
      status: "error",
      message: "Le nouveau mot de passe doit être différent de l'actuel.",
    });
  });

  it("demande un code de confirmation quand Supabase l'exige, sans changer le mot de passe", async () => {
    const deps = makeDeps({
      updateUser: vi.fn().mockResolvedValue({ error: { code: "reauthentication_needed" } }),
    });
    const result = await changePassword(baseInput, deps);
    expect(result).toEqual({ status: "needs-nonce" });
    expect(deps.reauthenticate).toHaveBeenCalled();
  });

  it("signale un code de confirmation invalide ou expiré", async () => {
    const deps = makeDeps({
      updateUser: vi.fn().mockResolvedValue({ error: { code: "reauthentication_not_valid" } }),
    });
    const result = await changePassword({ ...baseInput, needsNonce: true, nonce: "000000" }, deps);
    expect(result).toEqual({
      status: "error",
      message: "Le code de confirmation est invalide ou a expiré. Rechargez la page et réessayez.",
    });
  });

  it("signale un niveau d'authentification insuffisant (MFA non complétée sur cette session)", async () => {
    const deps = makeDeps({
      updateUser: vi.fn().mockResolvedValue({ error: { code: "insufficient_aal" } }),
    });
    const result = await changePassword(baseInput, deps);
    expect(result).toEqual({
      status: "error",
      message: "Reconnectez-vous avec votre code d'authentification, puis réessayez.",
    });
  });

  it("demande le mot de passe actuel s'il est vide, sans appeler Supabase", async () => {
    const deps = makeDeps();
    const result = await changePassword({ ...baseInput, current: "" }, deps);
    expect(result).toEqual({ status: "missing-current" });
    expect(deps.verifyCurrentPassword).not.toHaveBeenCalled();
  });
});
