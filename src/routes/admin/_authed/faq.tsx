import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FaqUpdate = Database["public"]["Tables"]["faq"]["Update"];

export const Route = createFileRoute("/admin/_authed/faq")({
  head: () => ({ meta: [{ title: "FAQ — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: FaqAdmin,
});

function FaqAdmin() {
  const qc = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      return (await supabase.from("faq").select("*").order("display_order")).data ?? [];
    },
  });
  async function add() {
    await supabase.from("faq").insert({ question: "Nouvelle question", answer: "Réponse à compléter…" });
    qc.invalidateQueries({ queryKey: ["admin-faq"] });
  }
  async function update(id: string, patch: FaqUpdate) {
    await supabase.from("faq").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-faq"] });
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("faq").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-faq"] });
  }
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <h1 className="font-display text-4xl italic text-primary">FAQ</h1>
        <button onClick={add} className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-widest">+ Ajouter</button>
      </header>
      <div className="space-y-3">
        {(items ?? []).map((q) => (
          <div key={q.id} className="bg-surface border border-border p-4 space-y-2">
            <input defaultValue={q.question} onBlur={(e) => update(q.id, { question: e.target.value })} className="w-full bg-background border border-border px-3 py-2 font-display italic" />
            <textarea defaultValue={q.answer} rows={3} onBlur={(e) => update(q.id, { answer: e.target.value })} className="w-full bg-background border border-border px-3 py-2 text-sm" />
            <div className="flex justify-between items-center text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={q.published} onChange={(e) => update(q.id, { published: e.target.checked })} /> Publié</label>
              <button onClick={() => remove(q.id)} className="text-destructive hover:underline">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
