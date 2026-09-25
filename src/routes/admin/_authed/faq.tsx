import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type FaqRow = Database["public"]["Tables"]["faq"]["Row"];

export const Route = createFileRoute("/admin/_authed/faq")({
  head: () => ({
    meta: [{ title: "FAQ — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: FaqAdmin,
});

function FaqAdmin() {
  const qc = useQueryClient();
  const setDirty = useDirtySet();
  const { data: items } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      return (await supabase.from("faq").select("*").order("display_order")).data ?? [];
    },
  });

  async function add() {
    const { error } = await supabase
      .from("faq")
      .insert({ question: "Nouvelle question", answer: "Réponse à compléter…" });
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-faq"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <h1 className="font-display text-4xl italic text-primary">FAQ</h1>
        <button
          onClick={add}
          className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-widest"
        >
          + Ajouter
        </button>
      </header>
      <div className="space-y-3">
        {(items ?? []).map((q) => (
          <FaqCard key={q.id} item={q} onDirtyChange={(dirty) => setDirty(q.id, dirty)} />
        ))}
      </div>
    </div>
  );
}

function FaqCard({
  item,
  onDirtyChange,
}: {
  item: FaqRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const { error } = await supabase.from("faq").update(patch).eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-faq"] });
      return { error };
    },
    onDirtyChange,
  );

  async function remove() {
    if (!confirmDelete("cette question")) return;
    const { error } = await supabase.from("faq").delete().eq("id", item.id);
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    toast.success("Question supprimée");
    qc.invalidateQueries({ queryKey: ["admin-faq"] });
  }

  return (
    <div className="bg-surface border border-border p-4 space-y-2">
      <input
        value={draft.question}
        onChange={(e) => setField("question", e.target.value)}
        className="w-full bg-background border border-border px-3 py-2 font-display italic"
      />
      <textarea
        value={draft.answer}
        rows={3}
        onChange={(e) => setField("answer", e.target.value)}
        className="w-full bg-background border border-border px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap justify-between items-center gap-3 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setField("published", e.target.checked)}
          />
          Publié
        </label>
        <div className="flex items-center gap-3">
          <button onClick={remove} className="text-destructive hover:underline">
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={save} />
        </div>
      </div>
    </div>
  );
}
