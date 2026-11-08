import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GalleryDuplication } from "@/lib/events/admin";

const OPTIONS: { value: GalleryDuplication; label: string; help: string }[] = [
  {
    value: "none",
    label: "Sans les galeries photos",
    help: "La copie démarre sans photos. C'est le plus simple pour une nouvelle édition.",
  },
  {
    value: "copy",
    label: "Reprendre les galeries",
    help: "Mêmes galeries et mêmes photos dans la copie. Vous pourrez ensuite les modifier sans toucher à l'original. Attention : les photos sont partagées, donc supprimer une photo dans l'administration des photos la retire des deux événements.",
  },
  {
    value: "reference",
    label: "Afficher les photos de l'édition précédente",
    help: "La copie garde ses propres galeries (vides au départ) et montre en plus celles de cet événement sous « Édition précédente ».",
  },
];

/** Choix à la duplication : que faire des galeries photos. Rien n'est créé avant la confirmation. */
export function DuplicateEventDialog({
  eventTitle,
  busy,
  onConfirm,
  onCancel,
}: {
  eventTitle: string;
  busy: boolean;
  onConfirm: (mode: GalleryDuplication) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<GalleryDuplication>("none");
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dupliquer « {eventTitle} »</DialogTitle>
          <DialogDescription>
            La copie est un brouillon : les dates sont à choisir et rien n&apos;est visible sur le
            site avant votre publication. Que faire des galeries photos ?
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Galeries photos" className="space-y-2">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block cursor-pointer border p-3 text-sm ${mode === option.value ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <input
                type="radio"
                name="gallery-duplication"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mr-2"
              />
              <strong>{option.label}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">{option.help}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 text-xs uppercase tracking-widest">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 hover:underline"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(mode)}
            className="bg-primary px-5 py-2 text-primary-foreground disabled:opacity-40"
          >
            {busy ? "Duplication…" : "Dupliquer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
