import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import {
  addGalleryDef,
  eventCategoryId,
  galleryTablesAvailable,
  listEventPlacements,
  listOtherEvents,
  moveGalleryDef,
  movePlacement,
  nextPlacementOrder,
  removePlacement,
  renameGalleryDef,
  saveGalleryDefs,
  saveGalleryReference,
  setPlacementAlt,
  setPlacementPublished,
  type AdminGalleryPhoto,
} from "@/lib/events/gallery-admin";
import { parseGalleryDefs, type EventGalleryDef } from "@/lib/events/galleries";
import type { EventRow } from "@/lib/events/types";
import { uploadEventPhoto } from "@/lib/photos/event-upload";

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif";

/**
 * Galeries photos d'un événement : créer des galeries (« catégories » de l'événement), envoyer des
 * photos, les ordonner, les masquer, les retirer, et afficher une galerie d'une autre édition.
 */
export function EventGalleriesAdmin({
  event,
  onEventChange,
}: {
  event: EventRow;
  onEventChange: (row: EventRow) => void;
}) {
  const qc = useQueryClient();
  const placementsKey = ["admin-event-placements", event.id];
  const [busy, setBusy] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [progress, setProgress] = useState<string | null>(null);

  // Colonnes de 20261110000000 : absentes tant qu'elle n'est pas appliquée.
  const hasGalleryColumns = Array.isArray((event as { galleries?: unknown }).galleries);
  const defs = parseGalleryDefs((event as { galleries?: unknown }).galleries);
  const referenceId =
    (event as { gallery_reference_event_id?: string | null }).gallery_reference_event_id ?? null;

  const tables = useQuery({ queryKey: ["admin-gallery-tables"], queryFn: galleryTablesAvailable });
  const ready = tables.data === true;
  const placements = useQuery({
    queryKey: placementsKey,
    queryFn: () => listEventPlacements(event.id),
    enabled: ready,
  });
  const others = useQuery({
    queryKey: ["admin-other-events", event.id],
    queryFn: () => listOtherEvents(event.id),
    enabled: hasGalleryColumns,
  });

  const photos = placements.data ?? [];
  const bySlot = (slot: string) => photos.filter((p) => p.slot === slot);

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (error) {
      toast.error(friendlySupabaseError(error));
    } finally {
      setBusy(null);
    }
  }

  const saveDefs = (next: EventGalleryDef[]) =>
    run("defs", async () => {
      onEventChange(await saveGalleryDefs(event.id, next));
    });
  const refresh = () => qc.invalidateQueries({ queryKey: placementsKey });

  const upload = (def: EventGalleryDef, files: File[]) =>
    run(`upload-${def.slot}`, async () => {
      const categoryId = await eventCategoryId();
      let order = nextPlacementOrder(
        bySlot(def.slot).map((p) => ({ id: p.placementId, display_order: p.displayOrder })),
      );
      let done = 0;
      const failures: string[] = [];
      for (const file of files) {
        setProgress(`Envoi ${done + 1}/${files.length} : ${file.name}`);
        try {
          const result = await uploadEventPhoto({
            file,
            alt: `${def.title} — ${event.title}`,
            eventId: event.id,
            eventSlug: event.slug,
            slot: def.slot,
            displayOrder: order,
            categoryId,
          });
          order += 1;
          done += 1;
          if (result.warning) toast.warning(result.warning);
        } catch (error) {
          failures.push(`${file.name} : ${friendlySupabaseError(error)}`);
        }
      }
      setProgress(null);
      await refresh();
      if (done > 0)
        toast.success(`${done} photo${done > 1 ? "s" : ""} ajoutée${done > 1 ? "s" : ""}.`);
      if (failures.length > 0) toast.error(failures.join("\n"));
    });

  if (tables.isPending) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-5">
      {import.meta.env.VITE_GALLERIES_FROM_STORAGE !== "true" && (
        <p className="border border-border bg-background p-3 text-xs">
          L&apos;affichage des galeries sur le site n&apos;est pas encore activé : vous pouvez déjà
          préparer vos galeries, elles apparaîtront à l&apos;activation.
        </p>
      )}
      {!ready && (
        <p className="border border-border bg-background p-3 text-xs">
          Les galeries photos nécessitent une mise à jour de la base de données (migration « photos
          »). Elles seront disponibles ensuite.
        </p>
      )}
      {ready && !hasGalleryColumns && (
        <p className="border border-border bg-background p-3 text-xs">
          Une mise à jour de la base de données est nécessaire (migration « galeries
          d&apos;événements ») avant de créer des galeries.
        </p>
      )}

      {ready && hasGalleryColumns && (
        <>
          {defs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune galerie pour le moment. Créez-en une ci-dessous.
            </p>
          )}
          {defs.map((def, index) => (
            <GalleryCard
              key={`${def.slot}-${def.title}`}
              def={def}
              photos={bySlot(def.slot)}
              isFirst={index === 0}
              isLast={index === defs.length - 1}
              busy={busy !== null}
              uploading={busy === `upload-${def.slot}`}
              progress={busy === `upload-${def.slot}` ? progress : null}
              onRename={(title) => void saveDefs(renameGalleryDef(defs, def.slot, title))}
              onMove={(delta) => void saveDefs(moveGalleryDef(defs, def.slot, delta))}
              onDelete={() => {
                if (window.confirm(`Supprimer la galerie « ${def.title} » ? Elle est vide.`)) {
                  void saveDefs(defs.filter((d) => d.slot !== def.slot));
                }
              }}
              onUpload={(files) => void upload(def, files)}
              onPhotoMove={(id, delta) =>
                void run("move", async () => {
                  await movePlacement(
                    bySlot(def.slot).map((p) => ({
                      id: p.placementId,
                      display_order: p.displayOrder,
                    })),
                    id,
                    delta,
                  );
                  await refresh();
                })
              }
              onPhotoPublished={(id, published) =>
                void run("publish", async () => {
                  await setPlacementPublished(id, published);
                  await refresh();
                })
              }
              onPhotoAlt={(id, alt) =>
                void run("alt", async () => {
                  await setPlacementAlt(id, alt);
                  toast.success("Description enregistrée.");
                  await refresh();
                })
              }
              onPhotoRemove={(id) => {
                if (
                  window.confirm(
                    "Retirer cette photo de la galerie ? Elle reste disponible dans l'administration des photos.",
                  )
                ) {
                  void run("remove", async () => {
                    await removePlacement(id);
                    await refresh();
                  });
                }
              }}
            />
          ))}

          <form
            className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const next = addGalleryDef(defs, newTitle);
                setNewTitle("");
                void saveDefs(next);
              } catch (error) {
                toast.error(friendlySupabaseError(error));
              }
            }}
          >
            <label className="min-w-64 flex-1 text-xs">
              <span className="font-mono uppercase tracking-widest text-muted-foreground">
                Nouvelle galerie
                <FieldHint>ex. Famille, Couples, Décor…</FieldHint>
              </span>
              <input
                value={newTitle}
                maxLength={80}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={busy !== null || !newTitle.trim()}
              className="min-h-11 bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-40"
            >
              + Créer la galerie
            </button>
          </form>

          <div className="space-y-1 border-t border-border pt-4">
            <label className="block text-xs">
              <span className="font-mono uppercase tracking-widest text-muted-foreground">
                Afficher aussi les photos d&apos;une autre édition
                <FieldHint>sous le titre « Édition précédente », sans copier les photos</FieldHint>
              </span>
              <select
                value={referenceId ?? ""}
                disabled={busy !== null}
                onChange={(e) =>
                  void run("reference", async () => {
                    onEventChange(await saveGalleryReference(event.id, e.target.value || null));
                    toast.success("Enregistré.");
                  })
                }
                className="mt-1 block w-full max-w-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Aucune</option>
                {(others.data ?? []).map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.title}
                    {other.status !== "published" ? " (non publié : rien ne s'affichera)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function GalleryCard({
  def,
  photos,
  isFirst,
  isLast,
  busy,
  uploading,
  progress,
  onRename,
  onMove,
  onDelete,
  onUpload,
  onPhotoMove,
  onPhotoPublished,
  onPhotoAlt,
  onPhotoRemove,
}: {
  def: EventGalleryDef;
  photos: AdminGalleryPhoto[];
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  uploading: boolean;
  progress: string | null;
  onRename: (title: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onUpload: (files: File[]) => void;
  onPhotoMove: (id: string, delta: -1 | 1) => void;
  onPhotoPublished: (id: string, published: boolean) => void;
  onPhotoAlt: (id: string, alt: string) => void;
  onPhotoRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState(def.title);
  return (
    <section
      className="space-y-3 border border-border bg-background p-4"
      aria-label={`Galerie ${def.title}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label={`Nom de la galerie ${def.title}`}
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-48 flex-1 border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || title.trim() === def.title}
          onClick={() => onRename(title)}
          className="text-xs uppercase tracking-widest text-primary hover:underline disabled:opacity-40"
        >
          Renommer
        </button>
        <span className="text-xs text-muted-foreground">
          {photos.length} photo{photos.length > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          aria-label={`Monter la galerie ${def.title}`}
          disabled={busy || isFirst}
          onClick={() => onMove(-1)}
          className="px-2 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Descendre la galerie ${def.title}`}
          disabled={busy || isLast}
          onClick={() => onMove(1)}
          className="px-2 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          type="button"
          disabled={busy || photos.length > 0}
          title={photos.length > 0 ? "Retirez d'abord les photos de cette galerie." : undefined}
          onClick={onDelete}
          className="text-xs text-destructive hover:underline disabled:opacity-30"
        >
          Supprimer la galerie
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {photos.map((photo, index) => (
          <PhotoRow
            key={`${photo.placementId}-${photo.alt}-${photo.published}`}
            photo={photo}
            isFirst={index === 0}
            isLast={index === photos.length - 1}
            busy={busy}
            onMove={(delta) => onPhotoMove(photo.placementId, delta)}
            onPublished={(p) => onPhotoPublished(photo.placementId, p)}
            onAlt={(alt) => onPhotoAlt(photo.placementId, alt)}
            onRemove={() => onPhotoRemove(photo.placementId)}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="cursor-pointer border border-primary px-4 py-2 uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
          {uploading ? "Envoi en cours…" : "Ajouter des photos"}
          <input
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            disabled={busy}
            aria-label={`Ajouter des photos à la galerie ${def.title}`}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) onUpload(files);
            }}
          />
        </label>
        <span className="text-muted-foreground">
          {progress ??
            "JPG, HEIC ou PNG. Les photos sont préparées sur cet appareil avant l'envoi."}
        </span>
      </div>
    </section>
  );
}

function PhotoRow({
  photo,
  isFirst,
  isLast,
  busy,
  onMove,
  onPublished,
  onAlt,
  onRemove,
}: {
  photo: AdminGalleryPhoto;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onPublished: (published: boolean) => void;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const [alt, setAlt] = useState(photo.alt);
  return (
    <li className="flex gap-3 border border-border bg-surface p-2">
      {photo.thumbUrl ? (
        <img
          src={photo.thumbUrl}
          alt=""
          width={96}
          height={96}
          className="h-24 w-24 flex-none object-cover"
        />
      ) : (
        <span className="flex h-24 w-24 flex-none items-center justify-center bg-background text-[10px] text-muted-foreground">
          Aperçu indisponible
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1 text-xs">
        <input
          aria-label="Description de la photo"
          value={alt}
          maxLength={300}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt.trim() !== photo.alt && onAlt(alt)}
          className="w-full border border-border bg-background px-2 py-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Photo précédente"
            disabled={busy || isFirst}
            onClick={() => onMove(-1)}
            className="px-1 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            disabled={busy || isLast}
            onClick={() => onMove(1)}
            className="px-1 disabled:opacity-30"
          >
            →
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onPublished(!photo.published)}
            className="hover:underline disabled:opacity-40"
          >
            {photo.published ? "Masquer" : "Réafficher"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="text-destructive hover:underline disabled:opacity-40"
          >
            Retirer
          </button>
          {!photo.published && <span className="text-muted-foreground">masquée</span>}
        </div>
      </div>
    </li>
  );
}
