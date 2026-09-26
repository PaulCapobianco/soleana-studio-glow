import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

export const Route = createFileRoute("/admin/_authed/prestations")({
  head: () => ({
    meta: [{ title: "Prestations — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PrestationsAdmin,
});

function PrestationsAdmin() {
  const qc = useQueryClient();
  const setDirty = useDirtySet();
  const { data: items } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      return (await supabase.from("services").select("*").order("display_order")).data ?? [];
    },
  });

  async function add() {
    const nextOrder = Math.max(0, ...(items ?? []).map((item) => item.display_order)) + 1;
    const { error } = await supabase.from("services").insert({
      // Stable technical identifier (unique), never shown or edited.
      slug: `prestation-${Date.now().toString(36)}`,
      name: "Nouvelle prestation",
      price_eur: 0,
      duration: "À compléter",
      photo_count: "À compléter",
      features: [],
      featured: false,
      active: false,
      display_order: nextOrder,
    });
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-services"] });
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <h1 className="font-display text-4xl italic text-primary">Prestations</h1>
        <button
          type="button"
          onClick={add}
          className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-widest"
        >
          + Ajouter
        </button>
      </header>
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
      const normalizedPatch: ServiceUpdate = { ...patch };
      if (patch.name !== undefined) normalizedPatch.name = patch.name.trim();
      if (patch.duration !== undefined) normalizedPatch.duration = patch.duration.trim();
      if (patch.photo_count !== undefined) normalizedPatch.photo_count = patch.photo_count.trim();

      const { error } = await supabase.from("services").update(normalizedPatch).eq("id", item.id);
      if (!error) await qc.invalidateQueries({ queryKey: ["admin-services"] });
      return { error };
    },
    onDirtyChange,
  );

  async function saveService() {
    if (!draft.name.trim() || !draft.duration.trim() || !draft.photo_count.trim()) {
      toast.error("Renseignez le nom, la durée et le nombre de photos.");
      return;
    }
    if (!Number.isInteger(draft.price_eur) || draft.price_eur < 0) {
      toast.error("Le prix doit être un nombre entier positif ou zéro.");
      return;
    }
    if (!Number.isInteger(draft.display_order) || draft.display_order < 0) {
      toast.error("L'ordre doit être un nombre entier positif ou zéro.");
      return;
    }

    if (await save()) {
      setField("name", draft.name.trim());
      setField("duration", draft.duration.trim());
      setField("photo_count", draft.photo_count.trim());
    }
  }

  async function remove() {
    if (!confirmDelete("cette prestation")) return;
    const { error } = await supabase.from("services").delete().eq("id", item.id);
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    toast.success("Prestation supprimée");
    qc.invalidateQueries({ queryKey: ["admin-services"] });
  }

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
          <FieldHint>carte mise en valeur avec le badge « Populaire »</FieldHint>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setField("active", e.target.checked)}
          />
          Active
          <FieldHint>visible sur le site</FieldHint>
        </label>
        <Input
          label="Ordre d'affichage"
          hint="position dans la liste : 1 = en premier"
          value={String(draft.display_order)}
          type="number"
          onChange={(v) => setField("display_order", Number(v))}
        />
        <div className="sm:col-span-2 flex items-center justify-between">
          <button
            type="button"
            onClick={remove}
            className="text-xs text-destructive hover:underline"
          >
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={() => void saveService()} />
        </div>
      </div>
    </details>
  );
}

function Input({
  label,
  hint,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
        {hint && <FieldHint>{hint}</FieldHint>}
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
