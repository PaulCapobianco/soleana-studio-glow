import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toastAdminError } from "@/lib/admin/write-error";
import { SeoPage, Placement, GALLERY_SLOTS } from "./types";
import { queryError } from "./helpers";

export function NewPlacementForm({
  photoId,
  seoPages,
  allPlacements,
}: {
  photoId: string;
  seoPages: SeoPage[];
  allPlacements: Placement[];
}) {
  const qc = useQueryClient();
  const [seoPageId, setSeoPageId] = useState("");
  const [slot, setSlot] = useState("gallery-1");
  const [order, setOrder] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const page = seoPages.find((item) => item.id === seoPageId);
  const slots = page ? GALLERY_SLOTS[page.slug] : ["gallery-1"];
  const nextOrder =
    Math.max(
      -1,
      ...allPlacements
        .filter((item) => item.seo_page_id === seoPageId && item.slot === slot)
        .map((item) => item.display_order),
    ) + 1;

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !page || !slots.includes(slot)) return;
    const displayOrder = order.trim() ? Number(order) : nextOrder;
    if (
      !Number.isSafeInteger(displayOrder) ||
      displayOrder < 0 ||
      allPlacements.some(
        (item) =>
          item.seo_page_id === seoPageId &&
          item.slot === slot &&
          item.display_order === displayOrder,
      )
    ) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (![x, y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
      return toast.error("Le cadrage doit être compris entre 0 et 100 %.");
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("photo_placements").insert({
        placement_key: `seo/${page.slug}/${slot}/${crypto.randomUUID().replaceAll("-", "")}`,
        photo_id: photoId,
        context_type: "seo",
        seo_page_id: seoPageId,
        slot,
        display_order: displayOrder,
        object_position_x_pct: x,
        object_position_y_pct: y,
        published,
      });
      queryError(error);
      toast.success("Emplacement ajouté");
      setOrder("");
      qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
    } catch (error) {
      void toastAdminError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="border-t border-border pt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-xs underline underline-offset-2">
        Ajouter à une autre galerie
      </summary>
      <form onSubmit={add} className="space-y-2 py-2">
        <label className="block text-xs">
          Page SEO
          <select
            required
            value={seoPageId}
            onChange={(event) => {
              setSeoPageId(event.target.value);
              setSlot("gallery-1");
              setOrder("");
            }}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
          >
            <option value="">Choisir une page</option>
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
            value={slot}
            onChange={(event) => {
              setSlot(event.target.value);
              setOrder("");
            }}
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
              value={order}
              placeholder={String(nextOrder)}
              onChange={(event) => setOrder(event.target.value)}
              className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
            />
          </label>
          <label className="text-xs">
            Cadrage X (%)
            <input
              type="number"
              min="0"
              max="100"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
              className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
            />
          </label>
          <label className="text-xs">
            Cadrage Y (%)
            <input
              type="number"
              min="0"
              max="100"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
              className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          Publier cet emplacement
        </label>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Ajout…" : "Ajouter l'emplacement"}
        </button>
      </form>
    </details>
  );
}
