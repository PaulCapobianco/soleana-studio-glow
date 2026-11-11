import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { hasBothFormats } from "@/lib/photos/variants";
import { supabase } from "@/integrations/supabase/client";
import { SaveButton } from "@/components/admin/SaveButton";
import { FieldHint } from "@/components/admin/FieldHint";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { useEditableRecord } from "@/lib/admin/use-editable-record";
import { CategoryRow, PhotoWithCategory, SeoPage, Placement, PhotoVariant } from "./types";
import { queryError, legacyStoragePath } from "./helpers";
import { NewPlacementForm } from "./NewPlacementForm";
import { PlacementEditor } from "./PlacementEditor";

export function PhotoCard({
  item,
  categories,
  seoPages,
  placements,
  variants,
  storageReady,
  eventUsage,
  allPlacements,
  onPlacementDirtyChange,
  onDirtyChange,
}: {
  item: PhotoWithCategory;
  categories: CategoryRow[];
  seoPages: SeoPage[];
  placements: Placement[];
  variants: PhotoVariant[];
  storageReady: boolean;
  /** Galeries d'événement où la photo est utilisée (« Événement · Galerie »). */
  eventUsage: string[];
  allPlacements: Placement[];
  onPlacementDirtyChange: (id: string, dirty: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  // The joined `category` field isn't a real column — keep it out of the
  // editable draft so it's never sent back in an update patch.
  const { category: _category, ...editable } = item;
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    editable,
    async (patch) => {
      const { error } = await supabase.from("photos").update(patch).eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      return { error };
    },
    onDirtyChange,
  );

  async function remove() {
    if (!confirmDelete("cette photo")) return;
    if (!storageReady)
      return toast.error("Attendez que la bibliothèque de photos soit disponible.");
    const legacyPath = variants.length === 0 ? legacyStoragePath(item.image_url) : null;
    let paths: string[] = [];
    let cleanupJobId: string | null = null;
    let photoDeleted = false;
    try {
      const { data, error } = await supabase.rpc("admin_delete_photo", {
        p_photo_id: item.id,
        p_legacy_path: legacyPath,
      });
      queryError(error);
      const deletion = data as { cleanup_job_id: string | null; object_paths: string[] };
      cleanupJobId = deletion.cleanup_job_id;
      paths = deletion.object_paths ?? [];
      photoDeleted = true;
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("photos").remove(paths);
        if (storageError) {
          if (cleanupJobId) {
            await supabase.rpc("admin_finish_photo_cleanup", {
              p_job_id: cleanupJobId,
              p_error: storageError.message,
            });
          }
          throw storageError;
        }
      }
      if (cleanupJobId) {
        queryError(
          (
            await supabase.rpc("admin_finish_photo_cleanup", {
              p_job_id: cleanupJobId,
              p_error: null,
            })
          ).error,
        );
      }
      toast.success("Photo et fichiers supprimés");
    } catch (error) {
      console.error("Suppression de la photo incomplète", { error, paths });
      toast.error(
        photoDeleted
          ? "La photo est retirée, mais certains fichiers n'ont pas pu être supprimés. Demandez une vérification du stockage."
          : "La suppression n'a pas pu être terminée. Vérifiez la bibliothèque avant de réessayer.",
      );
    } finally {
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-variants"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-storage-capacity"] });
    }
  }

  function savePhoto() {
    if (!draft.alt_text.trim()) return toast.error("Le texte alternatif est obligatoire.");
    void save();
  }

  return (
    <div className="bg-surface border border-border overflow-hidden">
      <img
        src={item.image_url}
        alt={item.alt_text}
        width={400}
        height={500}
        className="w-full aspect-[4/5] object-cover"
        loading="lazy"
      />
      <div className="p-4 space-y-2 text-sm">
        <label
          htmlFor={`photo-alt-${item.id}`}
          className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
        >
          Texte alternatif
          <FieldHint>description de la photo pour Google et les personnes malvoyantes</FieldHint>
        </label>
        <input
          id={`photo-alt-${item.id}`}
          value={draft.alt_text}
          onChange={(e) => setField("alt_text", e.target.value)}
          placeholder="Ex. Séance grossesse en forêt au coucher du soleil"
          required
          maxLength={300}
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        />
        <label
          htmlFor={`photo-location-${item.id}`}
          className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
        >
          Lieu
          <FieldHint>lieu de la séance, affiché en superposition sur la photo</FieldHint>
        </label>
        <input
          id={`photo-location-${item.id}`}
          value={draft.location ?? ""}
          onChange={(e) => setField("location", e.target.value)}
          placeholder="Ex. Lyon"
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        />
        <label
          htmlFor={`photo-category-${item.id}`}
          className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
        >
          Catégorie
          <FieldHint>classe la photo parmi les types de séances</FieldHint>
        </label>
        <select
          id={`photo-category-${item.id}`}
          value={draft.category_id ?? ""}
          onChange={(e) => setField("category_id", e.target.value || null)}
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        >
          <option value="">— Catégorie —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3 text-xs pt-1">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setField("published", e.target.checked)}
            />
            Publié
            <FieldHint>visible sur le site</FieldHint>
          </label>
          {/* Accueil / Portfolio restent masqués : les pages concernées ne lisent pas ces colonnes. */}
        </div>
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={remove}
            disabled={!storageReady}
            className="min-h-11 text-xs text-destructive hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
          <SaveButton
            isDirty={isDirty}
            isSaving={isSaving}
            onClick={savePhoto}
            className="min-h-11"
          />
        </div>
        {eventUsage.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Galerie d'événement : {eventUsage.join(" ; ")}. Son ordre, sa publication et son retrait
            se gèrent dans la fiche de l'événement.
          </p>
        )}
        {placements.map((placement) => (
          <PlacementEditor
            key={placement.id}
            placement={placement}
            seoPages={seoPages}
            allPlacements={allPlacements}
            onDirtyChange={(dirty) => onPlacementDirtyChange(placement.id, dirty)}
          />
        ))}
        {storageReady && hasBothFormats(variants) && (
          <NewPlacementForm photoId={item.id} seoPages={seoPages} allPlacements={allPlacements} />
        )}
      </div>
    </div>
  );
}
