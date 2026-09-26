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
type FaqUpdate = Database["public"]["Tables"]["faq"]["Update"];

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
    const nextOrder = Math.max(0, ...(items ?? []).map((item) => item.display_order)) + 1;
    const { error } = await supabase.from("faq").insert({
      question: "Nouvelle question",
      answer: "Réponse à compléter…",
      published: false,
      display_order: nextOrder,
    });
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
          type="button"
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
      const normalizedPatch: FaqUpdate = { ...patch };
      if (patch.question !== undefined) normalizedPatch.question = patch.question.trim();
      if (patch.answer !== undefined) normalizedPatch.answer = patch.answer.trim();

      const { error } = await supabase.from("faq").update(normalizedPatch).eq("id", item.id);
      if (!error) await qc.invalidateQueries({ queryKey: ["admin-faq"] });
      return { error };
    },
    onDirtyChange,
  );

  async function saveFaq() {
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error("Renseignez une question et une réponse.");
      return;
    }
    if (!Number.isInteger(draft.display_order) || draft.display_order < 0) {
      toast.error("L'ordre doit être un nombre entier positif ou zéro.");
      return;
    }

    if (await save()) {
      setField("question", draft.question.trim());
      setField("answer", draft.answer.trim());
    }
  }

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
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setField("published", e.target.checked)}
            />
            Publié
          </label>
          <label className="flex items-center gap-2">
            <span>Ordre d&apos;affichage</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.display_order}
              onChange={(e) => setField("display_order", Number(e.target.value))}
              className="w-20 bg-background border border-border px-2 py-1"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={remove} className="text-destructive hover:underline">
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={() => void saveFaq()} />
        </div>
      </div>
    </div>
  );
}
