import {
  friendlyAuthError,
  isInsufficientAal,
  isReauthenticationNeeded,
} from "@/lib/admin/auth-errors";
import { validateNewPassword, validatePasswordConfirmation } from "@/lib/admin/password-rules";

export type ChangePasswordInput = {
  email: string;
  current: string;
  next: string;
  confirm: string;
  needsNonce: boolean;
  nonce: string;
};

export type ChangePasswordDeps = {
  verifyCurrentPassword: (email: string, password: string) => Promise<boolean>;
  updateUser: (attrs: { password: string; nonce?: string }) => Promise<{ error: unknown }>;
  reauthenticate: () => Promise<{ error: unknown }>;
};

export type ChangePasswordResult =
  | { status: "missing-current" }
  | { status: "wrong-current" }
  | { status: "needs-nonce" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * Décide quoi faire pour un changement de mot de passe admin, sans toucher au DOM ni aux
 * toasts : la vérification du mot de passe actuel et la comparaison au nouveau se font
 * exclusivement via `deps` (client jetable, puis Supabase), jamais par une comparaison de
 * chaînes côté formulaire — voir le commentaire de `validateNewPassword` pour pourquoi.
 */
export async function changePassword(
  input: ChangePasswordInput,
  deps: ChangePasswordDeps,
): Promise<ChangePasswordResult> {
  const { email, current, next, confirm, needsNonce, nonce } = input;

  const problem =
    validateNewPassword(next, { email }) ?? validatePasswordConfirmation(next, confirm);
  if (!current) return { status: "missing-current" };
  if (problem) return { status: "error", message: problem };

  if (!(await deps.verifyCurrentPassword(email, current))) {
    return { status: "wrong-current" };
  }

  const { error } = await deps.updateUser({
    password: next,
    ...(needsNonce && nonce.trim() ? { nonce: nonce.trim() } : {}),
  });

  if (!error) return { status: "success" };

  if (isReauthenticationNeeded(error) && !needsNonce) {
    const { error: sendError } = await deps.reauthenticate();
    if (sendError) return { status: "error", message: friendlyAuthError(sendError) };
    return { status: "needs-nonce" };
  }

  if (isInsufficientAal(error)) {
    return {
      status: "error",
      message: "Reconnectez-vous avec votre code d'authentification, puis réessayez.",
    };
  }

  return { status: "error", message: friendlyAuthError(error) };
}
