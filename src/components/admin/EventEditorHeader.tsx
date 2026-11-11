import type { EventStatus } from "@/lib/events/types";

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

/** En-tête de la fiche événement : titre, statut, actions (enregistrer, publier, archiver…). */
export function EventEditorHeader({
  title,
  slug,
  status,
  firstPublishedAt,
  editionOver,
  isDirty,
  busy,
  previewOpen,
  onSave,
  onPublish,
  onChangeStatus,
  onTogglePreview,
  onDuplicate,
  onRemove,
}: {
  title: string;
  slug: string;
  status: EventStatus;
  firstPublishedAt: string | null;
  editionOver: boolean;
  isDirty: boolean;
  busy: string | null;
  previewOpen: boolean;
  onSave: () => void;
  onPublish: () => void;
  onChangeStatus: (
    next: EventStatus,
    confirmMessage: string | null,
    successMessage: string,
  ) => void;
  onTogglePreview: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl italic text-primary">{title || "Sans titre"}</h1>
        <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest">
          {STATUS_LABEL[status]}
        </span>
        {status === "published" && editionOver && (
          <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Édition terminée
          </span>
        )}
      </div>
      {status === "published" && (
        <p className="border border-primary/30 bg-primary/5 p-3 text-sm">
          Cet événement est <strong>publié</strong> : chaque enregistrement est visible tout de
          suite sur le site.{" "}
          <a href={`/${slug}`} target="_blank" rel="noopener" className="underline">
            Voir la page
          </a>
        </p>
      )}
      {status === "archived" && (
        <p className="border border-border bg-background p-3 text-sm">
          Cet événement est <strong>archivé</strong> : il n&apos;est plus visible sur le site.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest">
        <button
          type="button"
          disabled={!isDirty || busy !== null}
          onClick={onSave}
          className="bg-primary px-5 py-2 text-primary-foreground hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "save" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status !== "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onPublish}
            className="border border-primary px-5 py-2 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            {busy === "publish" ? "Publication…" : "Publier"}
          </button>
        )}
        {status === "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              onChangeStatus(
                "draft",
                "Dépublier cet événement ? Sa page ne sera plus visible sur le site (ni sur l'accueil) jusqu'à une nouvelle publication.",
                "Événement dépublié : il n'est plus visible sur le site.",
              )
            }
            className="border border-border px-5 py-2 hover:bg-background disabled:opacity-40"
          >
            Dépublier
          </button>
        )}
        <button
          type="button"
          onClick={onTogglePreview}
          className="border border-border px-5 py-2 hover:bg-background"
        >
          {previewOpen ? "Fermer l'aperçu" : "Aperçu"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={onDuplicate}
          className="px-2 py-2 text-primary hover:underline disabled:opacity-40"
        >
          Dupliquer
        </button>
        {status === "archived" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onChangeStatus("draft", null, "Remis en brouillon.")}
            className="px-2 py-2 text-muted-foreground hover:underline disabled:opacity-40"
          >
            Remettre en brouillon
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              onChangeStatus(
                "archived",
                status === "published"
                  ? "Archiver cet événement ? Sa page ne sera plus visible sur le site. Vous pourrez le remettre en brouillon plus tard."
                  : "Archiver cet événement ?",
                "Événement archivé.",
              )
            }
            className="px-2 py-2 text-muted-foreground hover:underline disabled:opacity-40"
          >
            Archiver
          </button>
        )}
        {status === "draft" && !firstPublishedAt && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onRemove}
            className="px-2 py-2 text-destructive hover:underline disabled:opacity-40"
          >
            Supprimer ce brouillon
          </button>
        )}
      </div>
      {isDirty && <p className="text-xs text-orange-700">Modifications non enregistrées.</p>}
    </header>
  );
}
