// Turns a Supabase/PostgREST error into a short, non-technical French
// message safe to show in the admin UI. Never surfaces error.message (or a
// raw Postgres error code) directly — see AUDIT.md SEC-05.
// Raised by admin forms for input problems the editor can fix; its message is
// already written for them, so it is shown as-is.
export class AdminValidationError extends Error {}

export function friendlySupabaseError(error: unknown): string {
  if (error instanceof AdminValidationError) return error.message;
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Connexion impossible. Vérifiez votre connexion internet et réessayez.";
  }
  if (
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("401") ||
    lower.includes("unauthorized")
  ) {
    return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  }
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("403")
  ) {
    return "Vous n'avez pas les droits nécessaires pour cette action.";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "Cette valeur existe déjà.";
  }
  if (lower.includes("violates") && lower.includes("constraint")) {
    return "Une des valeurs saisies n'est pas valide.";
  }

  // Fallback: never show the raw Supabase/Postgres message to a
  // non-technical user.
  return "Une erreur est survenue. Réessayez dans un instant.";
}
