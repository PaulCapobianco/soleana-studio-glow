import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

export const Route = createFileRoute("/admin/_authed/avis")({
  head: () => ({ meta: [{ title: "Avis — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Reviews,
});

function Reviews() {
  const qc = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      return (await supabase.from("reviews").select("*").order("display_order")).data ?? [];
    },
  });

  async function add() {
    const { error } = await supabase.from("reviews").insert({ first_name: "Nouveau", comment: "À compléter…", rating: 5 });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }
  async function update(id: string, patch: ReviewUpdate) {
    await supabase.from("reviews").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <h1 className="font-display text-4xl italic text-primary">Avis clients</h1>
        <button onClick={add} className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-widest">+ Ajouter</button>
      </header>
      <div className="space-y-4">
        {(items ?? []).map((r) => (
          <div key={r.id} className="bg-surface border border-border p-4 grid sm:grid-cols-2 gap-3 text-sm">
            <input defaultValue={r.first_name} onBlur={(e) => update(r.id, { first_name: e.target.value })} placeholder="Prénom" className="bg-background border border-border px-3 py-2" />
            <input defaultValue={r.session_type ?? ""} onBlur={(e) => update(r.id, { session_type: e.target.value })} placeholder="Type de séance" className="bg-background border border-border px-3 py-2" />
            <input type="number" min={1} max={5} defaultValue={r.rating} onBlur={(e) => update(r.id, { rating: Number(e.target.value) })} className="bg-background border border-border px-3 py-2" />
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={r.published} onChange={(e) => update(r.id, { published: e.target.checked })} /> Publié</label>
            <textarea defaultValue={r.comment} rows={3} onBlur={(e) => update(r.id, { comment: e.target.value })} className="sm:col-span-2 bg-background border border-border px-3 py-2" />
            <button onClick={() => remove(r.id)} className="text-xs text-destructive hover:underline justify-self-start">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
