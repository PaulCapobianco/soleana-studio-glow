import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export const Route = createFileRoute("/admin/_authed/prestations")({
  head: () => ({
    meta: [{ title: "Prestations — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PrestationsAdmin,
});

function PrestationsAdmin() {
  const setDirty = useDirtySet();
  const { data: items } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      return (await supabase.from("services").select("*").order("display_order")).data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl italic text-primary">Prestations</h1>
      <div className="space-y-3">
        {(items ?? []).map((s) => (
          <ServiceCard key={s.id} item={s} onDirtyChange={(dirty) => setDirty(s.id, dirty)} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({
  item,
  onDirtyChange,
}: {
  item: ServiceRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const { error } = await supabase.from("services").update(patch).eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      return { error };
    },
    onDirtyChange,
  );

  return (
    <details className="bg-surface border border-border">
      <summary className="p-4 cursor-pointer flex justify-between items-center">
        <span className="font-display text-xl italic">
          {item.name} — {item.price_eur}€
        </span>
        <span className="text-xs text-muted-foreground">{item.active ? "Active" : "Inactive"}</span>
      </summary>
      <div className="p-4 border-t border-border grid sm:grid-cols-2 gap-3 text-sm">
        <Input label="Nom" value={draft.name} onChange={(v) => setField("name", v)} />
        <Input
          label="Prix (€)"
          value={String(draft.price_eur)}
          type="number"
          onChange={(v) => setField("price_eur", Number(v))}
        />
        <Input label="Durée" value={draft.duration} onChange={(v) => setField("duration", v)} />
        <Input
          label="Nombre photos"
          value={draft.photo_count}
          onChange={(v) => setField("photo_count", v)}
        />
        <Textarea
          label="Description"
          value={draft.description ?? ""}
          onChange={(v) => setField("description", v)}
        />
        <Textarea
          label="Avantages (un par ligne)"
          value={(draft.features ?? []).join("\n")}
          onChange={(v) => setField("features", v.split("\n").filter(Boolean))}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => setField("featured", e.target.checked)}
          />
          Mise en avant
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setField("active", e.target.checked)}
          />
          Active
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={save} />
        </div>
      </div>
    </details>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm"
      />
    </div>
  );
}
function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm"
      />
    </div>
  );
}
