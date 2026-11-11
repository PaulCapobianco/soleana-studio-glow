/**
 * Champ identifiant caché (recommandation Chrome pour les formulaires de changement de mot de
 * passe qui n'affichent pas l'e-mail) : sans lui, les gestionnaires de mots de passe peuvent
 * associer le nouveau mot de passe au mauvais compte, ou ne rien proposer du tout. Masqué
 * visuellement avec `sr-only` (pas `display:none`/`hidden`, ignorés par l'autofill), retiré du
 * clavier et des lecteurs d'écran puisqu'il n'a aucune valeur pour l'utilisateur ; non modifiable.
 */
export function HiddenUsernameField({ email }: { email: string }) {
  return (
    <input
      type="text"
      name="username"
      autoComplete="username"
      value={email}
      readOnly
      aria-hidden="true"
      tabIndex={-1}
      className="sr-only"
    />
  );
}
