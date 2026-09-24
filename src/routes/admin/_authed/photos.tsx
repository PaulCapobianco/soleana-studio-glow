import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed/photos")({
  head: () => ({ meta: [{ title: "Photos — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PhotosAdmin,
});

function PhotosAdmin() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: photos } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const supabase = await loadSupabaseClient();
      const { data } = await supabase.from("photos").select("*, category:categories(name, slug)").order("display_order");
      return data ?? [];
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const supabase = await loadSupabaseClient();
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
    const { error } = await supabase.storage.from("photos").upload(name, file, { contentType: file.type, upsert: false });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("photos").getPublicUrl(name);
    const { error: insErr } = await supabase.from("photos").insert({ image_url: pub.publicUrl, alt_text: file.name });
    if (insErr) return toast.error(insErr.message);
    toast.success("Photo ajoutée");
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const supabase = await loadSupabaseClient();
    await supabase.from("photos").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    const supabase = await loadSupabaseClient();
    await supabase.from("photos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-photos"] });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <h1 className="font-display text-4xl italic text-primary">Photos</h1>
        <label className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest cursor-pointer hover:bg-foreground transition-colors">
          + Ajouter une photo
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
        </label>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(photos ?? []).map((p) => (
          <div key={p.id} className="bg-surface border border-border overflow-hidden">
            <img src={p.image_url} alt={p.alt_text} className="w-full aspect-[4/5] object-cover" loading="lazy" />
            <div className="p-4 space-y-2 text-sm">
              <input defaultValue={p.alt_text} onBlur={(e) => update(p.id, { alt_text: e.target.value })} placeholder="Alt SEO" className="w-full bg-background border border-border px-2 py-1 text-xs" />
              <input defaultValue={p.location ?? ""} onBlur={(e) => update(p.id, { location: e.target.value })} placeholder="Lieu" className="w-full bg-background border border-border px-2 py-1 text-xs" />
              <select defaultValue={p.category_id ?? ""} onChange={(e) => update(p.id, { category_id: e.target.value || null })} className="w-full bg-background border border-border px-2 py-1 text-xs">
                <option value="">— Catégorie —</option>
                {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex flex-wrap gap-3 text-xs pt-1">
                <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={p.published} onChange={(e) => update(p.id, { published: e.target.checked })} /> Publié</label>
                <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={p.on_home} onChange={(e) => update(p.id, { on_home: e.target.checked })} /> Accueil</label>
                <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={p.on_portfolio} onChange={(e) => update(p.id, { on_portfolio: e.target.checked })} /> Portfolio</label>
              </div>
              <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      {(photos?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground p-12 text-center bg-surface border border-border">Aucune photo. Cliquez sur « Ajouter une photo » pour commencer.</p>}
    </div>
  );
}
