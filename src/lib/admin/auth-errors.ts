// Messages français, sans détail technique, pour les erreurs d'authentification Supabase.
// On s'appuie sur `error.code` (auth-js) ; le message brut n'est jamais affiché.
export function authErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

export function isReauthenticationNeeded(error: unknown): boolean {
  return authErrorCode(error) === "reauthentication_needed";
}

export function isInsufficientAal(error: unknown): boolean {
  return authErrorCode(error) === "insufficient_aal";
}

export function friendlyAuthError(error: unknown): string {
  const code = authErrorCode(error);
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : "";

  switch (code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Cette adresse n'est pas encore confirmée. Ouvrez le lien reçu par e-mail.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisissez-en un plus long et plus varié.";
    case "same_password":
      return "Le nouveau mot de passe doit être différent de l'actuel.";
    case "email_exists":
    case "user_already_exists":
      return "Cette adresse e-mail est déjà utilisée.";
    case "email_address_invalid":
      return "Adresse e-mail invalide.";
    case "mfa_verification_failed":
    case "mfa_verification_rejected":
    case "mfa_challenge_expired":
      return "Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez.";
    case "insufficient_aal":
      return "Saisissez d'abord le code de votre application d'authentification.";
    case "otp_expired":
      return "Ce lien ou ce code a expiré. Demandez-en un nouveau.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La double authentification n'est pas activée sur le projet. Contactez l'administrateur du site.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "bad_jwt":
    case "no_authorization":
      return "Votre session a expiré. Reconnectez-vous puis réessayez.";
    case "reauthentication_needed":
    case "reauthentication_not_valid":
    case "reauth_nonce_missing":
      return "Une confirmation supplémentaire est nécessaire. Suivez les instructions à l'écran.";
    default:
      break;
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Connexion impossible. Vérifiez votre connexion internet et réessayez.";
  }
  return "Une erreur est survenue. Réessayez dans un instant.";
}
