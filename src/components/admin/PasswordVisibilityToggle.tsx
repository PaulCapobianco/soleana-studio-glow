import { Eye, EyeOff } from "lucide-react";

/**
 * Bouton œil / œil barré pour afficher ou masquer un champ de mot de passe. Bascule uniquement
 * l'attribut `type` de l'input associé (géré par l'appelant) : la valeur et le remplissage
 * automatique du navigateur ne sont pas touchés.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground"
    >
      {visible ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
