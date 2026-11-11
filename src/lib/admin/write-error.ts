import { toast } from "sonner";
import { friendlySupabaseError } from "./friendly-error";
import { getMfaState, type MfaState } from "./mfa";

export const MFA_SETUP_MESSAGE =
  "Cette action demande la double authentification. Activez-la dans « Mon compte », puis reconnectez-vous avec votre code à 6 chiffres.";
export const MFA_REAUTH_MESSAGE =
  "Reconnectez-vous avec votre code à 6 chiffres pour modifier le site.";

export type AdminErrorInfo = {
  message: string;
  /** Vrai quand le refus vient du second facteur manquant (session AAL1). */
  needsMfa: boolean;
};

/** Refus RLS / droits Postgres (code 42501 ou message "row-level security"). */
export function isRlsDenial(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "42501") return true;
  return typeof message === "string" && message.toLowerCase().includes("row-level security");
}

/**
 * Message à afficher pour une erreur d'écriture de l'admin. Un refus RLS
 * en session AAL1 vient du second facteur manquant, pas d'un manque de
 * droits : on l'explique. En AAL2 (ou si le niveau est illisible), on garde
 * le message habituel.
 */
export async function resolveAdminError(
  error: unknown,
  getState: () => Promise<MfaState> = getMfaState,
): Promise<AdminErrorInfo> {
  const fallback = { message: friendlySupabaseError(error), needsMfa: false };
  if (!isRlsDenial(error)) return fallback;
  try {
    const state = await getState();
    if (state.currentLevel === "aal2") return fallback;
    const hasFactor = state.nextLevel === "aal2" || state.factorId !== null;
    return { message: hasFactor ? MFA_REAUTH_MESSAGE : MFA_SETUP_MESSAGE, needsMfa: true };
  } catch {
    return fallback;
  }
}

/** Texte seul, pour les messages composés (ex. liste d'échecs). */
export async function adminErrorMessage(error: unknown): Promise<string> {
  return (await resolveAdminError(error)).message;
}

/** Toast d'erreur unique pour toutes les écritures de l'admin. */
export async function toastAdminError(error: unknown): Promise<void> {
  const { message, needsMfa } = await resolveAdminError(error);
  if (needsMfa) {
    toast.error(message, {
      duration: 10000,
      action: {
        label: "Mon compte",
        onClick: () => window.location.assign("/admin/compte"),
      },
    });
  } else {
    toast.error(message);
  }
}
