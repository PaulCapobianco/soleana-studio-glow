const COMMON = new Set([
  "motdepasse123",
  "motdepasse1234",
  "password1234",
  "password123456",
  "azerty123456",
  "azertyuiop12",
  "123456789012",
  "soleanastudio1",
]);

/**
 * Règles de robustesse d'un nouveau mot de passe admin. Retourne un message d'erreur
 * (le premier problème rencontré) ou null si le mot de passe est acceptable.
 */
export function validateNewPassword(
  password: string,
  options: { email?: string | null; current?: string | null } = {},
): string | null {
  if (password.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (password.length > 72) return "Le mot de passe est trop long (72 caractères maximum).";
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  if (/^(.)\1+$/.test(password)) return "Choisissez un mot de passe plus varié.";
  if (COMMON.has(password.toLowerCase().replace(/\s/g, ""))) {
    return "Ce mot de passe est trop courant. Choisissez-en un autre.";
  }
  const email = options.email?.trim().toLowerCase();
  if (email && (password.toLowerCase() === email || password.toLowerCase().includes(email))) {
    return "Le mot de passe ne doit pas contenir votre adresse e-mail.";
  }
  if (options.current && password === options.current) {
    return "Le nouveau mot de passe doit être différent de l'actuel.";
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  return password === confirmation ? null : "Les deux mots de passe ne correspondent pas.";
}
