import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { toastAdminError } from "@/lib/admin/write-error";
import { DuplicateEventDialog } from "@/components/site/admin/DuplicateEventDialog";
import {
  createEvent,
  duplicateEvent,
  listEvents,
  saveEvent,
  type GalleryDuplication,
} from "@/lib/events/admin";
import { formatTeaserDates, isEditionOver } from "@/lib/events/dates";
import type { EventRow, EventStatus } from "@/lib/events/types";

export const Route = createFileRoute("/admin/_authed/evenements/")({
  head: () => ({
    meta: [{ title: "Événements — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: EventsAdmin,
});

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const STATUS_STYLE: Record<EventStatus, string> = {
  draft: "bg-background text-muted-foreground border-border",
  published: "bg-primary text-primary-foreground border-primary",
  archived: "bg-background text-muted-foreground/70 border-border line-through",
};

type Filter = "all" | EventStatus;

function EventsAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<EventRow | null>(null);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-events"],
    queryFn: listEvents,
  });

  const items = (data ?? []).filter((e) => filter === "all" || e.status === filter);

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (err) {
      void toastAdminError(err);
    } finally {
      setBusy(null);
    }
  }

  const create = () =>
    run("create", async () => {
      const created = await createEvent(newTitle);
      await qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Événement créé en brouillon : complétez maintenant la fiche.");
      setNewTitle("");
      await navigate({ to: "/admin/evenements/$id", params: { id: created.id } });
    });

  const duplicate = (row: EventRow, galleries: GalleryDuplication) =>
    run(`dup-${row.id}`, async () => {
      setDuplicateOf(null);
      const copy = await duplicateEvent(row, galleries);
      await qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Copie créée en brouillon. Choisissez maintenant les nouvelles dates.");
      await navigate({ to: "/admin/evenements/$id", params: { id: copy.id } });
    });

  const setStatus = (row: EventRow, status: EventStatus, message: string) =>
    run(`status-${row.id}`, async () => {
      await saveEvent(row.id, {}, status);
      await qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success(message);
    });

  function archive(row: EventRow) {
    const wasPublic = row.status === "published";
    const ok = window.confirm(
      wasPublic
        ? "Archiver cet événement ? Sa page ne sera plus visible sur le site (elle affichera « page introuvable ») et il disparaîtra de l'accueil. Vous pourrez le remettre en brouillon plus tard."
        : "Archiver cet événement ?",
    );
    if (ok) void setStatus(row, "archived", "Événement archivé.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl italic text-primary">Événements</h1>
        <label className="text-xs">
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            Afficher
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="ml-2 border border-border bg-background px-2 py-1"
          >
            <option value="all">Tous</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés</option>
          </select>
        </label>
      </header>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Ici, vous créez et modifiez les pages d&apos;événements (mini-séances de Noël, séances de
        printemps…). Un événement <strong>publié</strong> est visible sur le site ; un{" "}
        <strong>brouillon</strong> ou un événement <strong>archivé</strong> ne l&apos;est pas.
      </p>

      <form
        className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label className="min-w-64 flex-1 text-xs">
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            Nouvel événement
            <FieldHint>donnez-lui un titre, vous complétez le reste ensuite</FieldHint>
          </span>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex. Mini-séances de printemps 2027"
            maxLength={120}
            className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null || !newTitle.trim()}
          className="bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-40"
        >
          {busy === "create" ? "Création…" : "+ Créer"}
        </button>
      </form>

      {isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger les événements ({friendlySupabaseError(error)})
          <button type="button" onClick={() => void refetch()} className="ml-2 underline">
            Réessayer
          </button>
        </div>
      )}
      {!isPending && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {data?.length
            ? "Aucun événement dans cette catégorie."
            : "Aucun événement pour le moment."}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((row) => {
          const over = isEditionOver(row.event_dates, row.fallback_dates, new Date());
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 border border-border bg-surface p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/admin/evenements/$id"
                    params={{ id: row.id }}
                    className="font-display text-xl italic text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span
                    className={`border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLE[row.status as EventStatus] ?? ""}`}
                  >
                    {STATUS_LABEL[row.status as EventStatus] ?? row.status}
                  </span>
                  {row.status === "published" && over && (
                    <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Édition terminée
                    </span>
                  )}
                  {row.status === "published" && row.show_teaser && !over && (
                    <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Sur l&apos;accueil
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.event_dates.length > 0
                    ? formatTeaserDates(row.event_dates)
                    : "Aucune date choisie"}
                  {" · "}/{row.slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <Link
                  to="/admin/evenements/$id"
                  params={{ id: row.id }}
                  className="uppercase tracking-widest text-primary hover:underline"
                >
                  Modifier
                </Link>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setDuplicateOf(row)}
                  className="uppercase tracking-widest text-primary hover:underline disabled:opacity-40"
                >
                  Dupliquer
                </button>
                {row.status === "archived" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void setStatus(row, "draft", "Remis en brouillon.")}
                    className="text-muted-foreground hover:underline disabled:opacity-40"
                  >
                    Remettre en brouillon
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => archive(row)}
                    className="text-muted-foreground hover:underline disabled:opacity-40"
                  >
                    Archiver
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {duplicateOf && (
        <DuplicateEventDialog
          eventTitle={duplicateOf.title}
          busy={busy !== null}
          onCancel={() => setDuplicateOf(null)}
          onConfirm={(mode) => void duplicate(duplicateOf, mode)}
        />
      )}
    </div>
  );
}
