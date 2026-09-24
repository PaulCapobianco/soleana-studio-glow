import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Was a generic makeCrud(table, queryKey) factory, but it only ever had one
// caller (the "services" table below) and making it properly type-safe
// across an arbitrary table fights supabase-js's overloaded `.from()` —
// the generic type parameter isn't resolved to a literal consistently
// across the two `.from(table)` calls (select + update) in the same
// closure, so TypeScript falls back to comparing against the whole
// Database shape instead of the one table. Specializing it for "services"
// (its only real use) is honest and keeps everything typed correctly;
// reintroduce genericity if a second table needs the same shape.
function useServicesCrud() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      return (await supabase.from("services").select("*").order("display_order")).data ?? [];
    },
  });
  async function update(id: string, patch: Database["public"]["Tables"]["services"]["Update"]) {
    const { error } = await supabase.from("services").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Enregistré");
      qc.invalidateQueries({ queryKey: ["admin-services"] });
    }
  }
  return { items: data ?? [], update };
}

export const Route = createFileRoute("/admin/_authed/prestations")({
  head: () => ({ meta: [{ title: "Prestations — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => {
    const { items, update } = useServicesCrud();
    return (
      <div className="space-y-8">
        <h1 className="font-display text-4xl italic text-primary">Prestations</h1>
        <div className="space-y-3">
          {items.map((s) => (
            <details key={s.id} className="bg-surface border border-border">
              <summary className="p-4 cursor-pointer flex justify-between items-center">
                <span className="font-display text-xl italic">{s.name} — {s.price_eur}€</span>
                <span className="text-xs text-muted-foreground">{s.active ? "Active" : "Inactive"}</span>
              </summary>
              <div className="p-4 border-t border-border grid sm:grid-cols-2 gap-3 text-sm">
                <Input label="Nom" value={s.name} onSave={(v) => update(s.id, { name: v })} />
                <Input label="Prix (€)" value={String(s.price_eur)} type="number" onSave={(v) => update(s.id, { price_eur: Number(v) })} />
                <Input label="Durée" value={s.duration} onSave={(v) => update(s.id, { duration: v })} />
                <Input label="Nombre photos" value={s.photo_count} onSave={(v) => update(s.id, { photo_count: v })} />
                <Textarea label="Description" value={s.description ?? ""} onSave={(v) => update(s.id, { description: v })} />
                <Textarea label="Avantages (un par ligne)" value={(s.features ?? []).join("\n")} onSave={(v) => update(s.id, { features: v.split("\n").filter(Boolean) })} />
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={s.featured} onChange={(e) => update(s.id, { featured: e.target.checked })} /> Mise en avant</label>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={s.active} onChange={(e) => update(s.id, { active: e.target.checked })} /> Active</label>
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  },
});

function Input({ label, value, onSave, type = "text" }: { label: string; value: string; onSave: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} defaultValue={value} onBlur={(e) => e.target.value !== value && onSave(e.target.value)} className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm" />
    </div>
  );
}
function Textarea({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <div className="sm:col-span-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <textarea defaultValue={value} rows={4} onBlur={(e) => e.target.value !== value && onSave(e.target.value)} className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm" />
    </div>
  );
}
