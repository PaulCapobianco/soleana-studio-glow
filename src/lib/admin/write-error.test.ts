import { describe, expect, it, vi } from "vitest";
import {
  MFA_REAUTH_MESSAGE,
  MFA_SETUP_MESSAGE,
  isRlsDenial,
  resolveAdminError,
} from "./write-error";

const rls = {
  code: "42501",
  message: 'new row violates row-level security policy for table "faq"',
};
const state = (
  over: Partial<{ currentLevel: string; nextLevel: string; factorId: string | null }>,
) =>
  vi.fn().mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal1", factorId: null, ...over });

describe("resolveAdminError", () => {
  it("aal1 sans facteur + refus RLS : invite à activer la double authentification", async () => {
    const r = await resolveAdminError(rls, state({}));
    expect(r).toEqual({ message: MFA_SETUP_MESSAGE, needsMfa: true });
  });

  it("aal1 avec facteur enregistré + refus RLS : invite à se reconnecter avec le code", async () => {
    const r = await resolveAdminError(rls, state({ nextLevel: "aal2", factorId: "f1" }));
    expect(r).toEqual({ message: MFA_REAUTH_MESSAGE, needsMfa: true });
  });

  it("aal2 + refus RLS : garde le message de droits habituel", async () => {
    const getState = state({ currentLevel: "aal2", nextLevel: "aal2", factorId: "f1" });
    const r = await resolveAdminError(rls, getState);
    expect(r).toEqual({
      message: "Vous n'avez pas les droits nécessaires pour cette action.",
      needsMfa: false,
    });
  });

  it("autre erreur : message habituel, sans consulter la session", async () => {
    const getState = state({});
    const r = await resolveAdminError({ message: "duplicate key value" }, getState);
    expect(r).toEqual({ message: "Cette valeur existe déjà.", needsMfa: false });
    expect(getState).not.toHaveBeenCalled();
  });

  it("niveau illisible : message habituel", async () => {
    const r = await resolveAdminError(rls, vi.fn().mockRejectedValue(new Error("x")));
    expect(r.needsMfa).toBe(false);
  });
});

describe("isRlsDenial", () => {
  it("reconnaît le code 42501 ou le message", () => {
    expect(isRlsDenial({ code: "42501", message: "permission denied" })).toBe(true);
    expect(isRlsDenial({ message: "violates Row-Level Security" })).toBe(true);
    expect(isRlsDenial({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isRlsDenial(null)).toBe(false);
  });
});
