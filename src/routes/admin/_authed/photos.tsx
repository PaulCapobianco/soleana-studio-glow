import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type PhotoWithCategory = PhotoRow & { category: Pick<CategoryRow, "name" | "slug"> | null };

export const Route = createFileRoute("/admin/_authed/photos")({
  head: () => ({
    meta: [{ title: "Photos — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PhotosAdmin,
});

function PhotosAdmin() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const setDirty = useDirtySet();

  const { data: photos } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("photos")
        .select("*, category:categories(name, slug)")
        .order("display_order");
      return (data ?? []) as PhotoWithCategory[];
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      return (await supabase.from("categories").select("*").order("display_order")).data ?? [];
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Format accepté : JPG, PNG, WebP");
    }
    if (file.size > 10 * 1024 * 1024) return toast.error("Fichier max 10 Mo");
    const ext = file.name.split(".").pop();
    const name = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("photos")
      .upload(name, file, { contentType: file.type, upsert: false });
    if (error) return toast.error(friendlySupabaseError(error));
    const { data: pub } = supabase.storage.from("photos").getPublicUrl(name);
    const { error: insErr } = await supabase
      .from("photos")
      .insert({ image_url: pub.publicUrl, alt_text: file.name });
    if (insErr) return toast.error(friendlySupabaseError(insErr));
    toast.success("Photo ajoutée");
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <h1 className="font-display text-4xl italic text-primary">Photos</h1>
        <label className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-foreground transition-colors">
          + Ajouter une photo
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(photos ?? []).map((p) => (
          <PhotoCard
            key={p.id}
            item={p}
            categories={cats ?? []}
            onDirtyChange={(dirty) => setDirty(p.id, dirty)}
          />
        ))}
      </div>
      {(photos?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground p-12 text-center bg-surface border border-border">
          Aucune photo. Cliquez sur « Ajouter une photo » pour commencer.
        </p>
      )}
    </div>
  );
}

function PhotoCard({
  item,
  categories,
  onDirtyChange,
}: {
  item: PhotoWithCategory;
  categories: CategoryRow[];
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
    const { error } = await supabase.from("photos").delete().eq("id", item.id);
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    toast.success("Photo supprimée");
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
  }

  return (
    <div className="bg-surface border border-border overflow-hidden">
      <img
        src={item.image_url}
        alt={item.alt_text}
        className="w-full aspect-[4/5] object-cover"
        loading="lazy"
      />
      <div className="p-4 space-y-2 text-sm">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Texte alternatif
          <FieldHint>description de la photo pour Google et les personnes malvoyantes</FieldHint>
        </label>
        <input
          value={draft.alt_text}
          onChange={(e) => setField("alt_text", e.target.value)}
          placeholder="Ex. Séance grossesse en forêt au coucher du soleil"
          className="w-full bg-background border border-border px-2 py-1 text-xs"
        />
        <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Lieu
          <FieldHint>lieu de la séance, affiché en superposition sur la photo</FieldHint>
        </label>
        <input
          value={draft.location ?? ""}
          onChange={(e) => setField("location", e.target.value)}
          placeholder="Ex. Lyon"
          className="w-full bg-background border border-border px-2 py-1 text-xs"
        />
        <select
          value={draft.category_id ?? ""}
          onChange={(e) => setField("category_id", e.target.value || null)}
          className="w-full bg-background border border-border px-2 py-1 text-xs"
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
          {/* Accueil / Portfolio (on_home / on_portfolio) : masqués tant qu'aucune page publique
              ne les lit (seuls `published` et `category_id` comptent aujourd'hui). Colonnes et
              données restent intactes ; à réafficher lors de la migration Storage des photos, cf.
              docs/photos-storage/README.md. */}
        </div>
        <div className="flex items-center justify-between pt-1">
          <button onClick={remove} className="text-xs text-destructive hover:underline">
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={save} />
        </div>
      </div>
    </div>
  );
}
