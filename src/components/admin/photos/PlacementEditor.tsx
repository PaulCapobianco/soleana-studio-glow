import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SaveButton } from "@/components/admin/SaveButton";
import { FieldHint } from "@/components/admin/FieldHint";
import { useEditableRecord } from "@/lib/admin/use-editable-record";
import { SeoPage, Placement, GALLERY_SLOTS } from "./types";

export function PlacementEditor({
  placement,
  seoPages,
  allPlacements,
  onDirtyChange,
}: {
  placement: Placement;
  seoPages: SeoPage[];
  allPlacements: Placement[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    placement,
    async (patch) => {
      const { error } = await supabase
        .from("photo_placements")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", placement.id);
      if (!error) qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
      return { error };
    },
    onDirtyChange,
  );
  const page = seoPages.find((item) => item.id === draft.seo_page_id);
  const slots = page ? GALLERY_SLOTS[page.slug] : [draft.slot];

  function savePlacement() {
    if (!page || !slots.includes(draft.slot)) return toast.error("Choisissez une galerie valide.");
    if (
      !Number.isSafeInteger(Number(draft.display_order)) ||
      Number(draft.display_order) < 0 ||
      allPlacements.some(
        (item) =>
          item.id !== placement.id &&
          item.seo_page_id === draft.seo_page_id &&
          item.slot === draft.slot &&
          item.display_order === Number(draft.display_order),
      )
    ) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (
      ![draft.object_position_x_pct, draft.object_position_y_pct].every(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
      )
    ) {
      return toast.error("Le cadrage doit être compris entre 0 et 100 %.");
    }
    void save();
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider">
        Emplacement dans une galerie
      </h3>
      <label className="block text-xs">
        Page SEO
        <select
          value={draft.seo_page_id}
          onChange={(event) => {
            setField("seo_page_id", event.target.value);
            setField("slot", "gallery-1");
          }}
          className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
        >
          {seoPages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.h1}
              {item.published ? "" : " (non publiée)"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        Galerie
        <select
          value={draft.slot}
          onChange={(event) => setField("slot", event.target.value)}
          className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
        >
          {slots.map((item) => (
            <option key={item} value={item}>
              Galerie {item.split("-")[1]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">
          Ordre
          <input
            type="number"
            min="0"
            step="1"
            value={draft.display_order}
            onChange={(event) => setField("display_order", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
          />
        </label>
        <label className="text-xs">
          Cadrage horizontal (%)
          <input
            type="number"
            min="0"
            max="100"
            value={draft.object_position_x_pct}
            onChange={(event) => setField("object_position_x_pct", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
          />
        </label>
        <label className="text-xs">
          Cadrage vertical (%)
          <input
            type="number"
            min="0"
            max="100"
            value={draft.object_position_y_pct}
            onChange={(event) => setField("object_position_y_pct", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
          />
        </label>
      </div>
      <FieldHint>0 % place le sujet en haut ou à gauche ; 100 % en bas ou à droite.</FieldHint>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(event) => setField("published", event.target.checked)}
        />
        Publié dans la galerie
      </label>
      <SaveButton
        isDirty={isDirty}
        isSaving={isSaving}
        onClick={savePlacement}
        className="min-h-11"
      />
    </div>
  );
}
