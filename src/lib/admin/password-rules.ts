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
 *
 * Ne compare pas au mot de passe actuel : ce champ n'est vérifié (via un client jetable)
 * qu'après ces règles, donc le comparer ici reviendrait à comparer contre une valeur pas
 * encore confirmée (autofill du navigateur, saisie restée d'un essai précédent…). Supabase
 * refuse déjà un nouveau mot de passe identique à l'actuel (`same_password`) une fois le mot
 * de passe actuel vérifié — c'est la seule source fiable pour cette règle.
 */
export function validateNewPassword(
  password: string,
  options: { email?: string | null } = {},
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
  return null;
}

/**
 * Compare en forme Unicode normalisée (NFC) : un clavier/IME peut produire un accent composé
 * différemment (ex. « é » précomposé vs « e » + accent combinant) selon le champ, ce qui rendrait
 * deux saisies visuellement identiques différentes en comparaison stricte de chaînes.
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  return password.normalize("NFC") === confirmation.normalize("NFC")
    ? null
    : "Les deux mots de passe ne correspondent pas.";
}
