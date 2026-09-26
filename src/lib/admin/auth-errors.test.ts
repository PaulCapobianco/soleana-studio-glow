import { describe, expect, it } from "vitest";
import { friendlyAuthError, isInsufficientAal, isReauthenticationNeeded } from "./auth-errors";

describe("friendlyAuthError", () => {
  const cases: Array<[string, string]> = [
    ["invalid_credentials", "E-mail ou mot de passe incorrect."],
    ["weak_password", "Ce mot de passe est trop faible. Choisissez-en un plus long et plus varié."],
    ["same_password", "Le nouveau mot de passe doit être différent de l'actuel."],
    ["email_exists", "Cette adresse e-mail est déjà utilisée."],
    ["user_already_exists", "Cette adresse e-mail est déjà utilisée."],
    [
      "reauthentication_needed",
      "Une confirmation supplémentaire est nécessaire. Suivez les instructions à l'écran.",
    ],
    [
      "reauthentication_not_valid",
      "Le code de confirmation est invalide ou a expiré. Rechargez la page et réessayez.",
    ],
    [
      "reauth_nonce_missing",
      "Le code de confirmation est invalide ou a expiré. Rechargez la page et réessayez.",
    ],
    ["insufficient_aal", "Saisissez d'abord le code de votre application d'authentification."],
    ["session_expired", "Votre session a expiré. Reconnectez-vous puis réessayez."],
  ];

  it.each(cases)("code %s -> message attendu", (code, expected) => {
    expect(friendlyAuthError({ code })).toBe(expected);
  });

  it("distingue le besoin d'un code de confirmation d'un code invalide/expiré", () => {
    // reauthentication_needed et reauth_nonce_missing sont deux causes différentes ;
    // un même message pour les deux induirait l'utilisateur en erreur.
    expect(friendlyAuthError({ code: "reauthentication_needed" })).not.toBe(
      friendlyAuthError({ code: "reauth_nonce_missing" }),
    );
  });

  it("retombe sur un message générique pour un code inconnu, sans exposer de détail technique", () => {
    expect(friendlyAuthError({ code: "some_future_code", message: "internal detail" })).toBe(
      "Une erreur est survenue. Réessayez dans un instant.",
    );
  });

  it("détecte une erreur réseau même sans code", () => {
    expect(friendlyAuthError({ message: "Failed to fetch" })).toBe(
      "Connexion impossible. Vérifiez votre connexion internet et réessayez.",
    );
  });
});

describe("isReauthenticationNeeded / isInsufficientAal", () => {
  it("ne se confondent pas entre elles", () => {
    expect(isReauthenticationNeeded({ code: "insufficient_aal" })).toBe(false);
    expect(isInsufficientAal({ code: "reauthentication_needed" })).toBe(false);
  });
});
