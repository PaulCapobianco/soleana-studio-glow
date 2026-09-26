import { supabase } from "@/integrations/supabase/client";

export const TOTP_CODE = /^\d{6}$/;

/** Enlève espaces et tirets d'un code saisi ("123 456" -> "123456"). */
export function normalizeTotpCode(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export type MfaState = {
  /** Niveau de la session actuelle. */
  currentLevel: string | null;
  /** Niveau atteignable : aal2 si un second facteur est enregistré. */
  nextLevel: string | null;
  /** Facteur TOTP vérifié (actif), s'il existe. */
  factorId: string | null;
};

export async function getMfaState(): Promise<MfaState> {
  const [{ data: aal }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  return {
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
    factorId: factors?.totp?.[0]?.id ?? null,
  };
}

/** Vrai si la session est connectée mais doit encore saisir le code du second facteur. */
export function needsSecondFactor(state: MfaState): boolean {
  return state.nextLevel === "aal2" && state.currentLevel !== "aal2";
}

export async function verifyTotp(factorId: string, code: string) {
  return supabase.auth.mfa.challengeAndVerify({ factorId, code: normalizeTotpCode(code) });
}
