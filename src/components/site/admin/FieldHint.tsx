// Courte explication en français simple, affichée à côté d'un libellé technique
// pour une utilisatrice non technicienne. Toujours entre parenthèses, plus petite
// et plus discrète que le libellé.
export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 font-sans text-[10px] normal-case font-normal tracking-normal text-muted-foreground/60">
      ({children})
    </span>
  );
}
