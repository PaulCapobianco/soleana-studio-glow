import { cn } from "@/lib/utils";

type SaveButtonProps = {
  isDirty: boolean;
  isSaving: boolean;
  onClick: () => void;
  className?: string;
};

// Shared "Enregistrer" button for every admin edit form: disabled while
// saving (prevents double-clicks / duplicate writes) and disabled when
// there's nothing to save, so it's always clear whether an action is
// available.
export function SaveButton({ isDirty, isSaving, onClick, className }: SaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isDirty || isSaving}
      className={cn(
        "inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground transition-colors hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary",
        className,
      )}
    >
      {isSaving ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}
