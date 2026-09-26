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
import { isGoogleReviewUrl } from "@/lib/google-review-url";

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

export const Route = createFileRoute("/admin/_authed/avis")({
  head: () => ({
    meta: [{ title: "Avis — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Reviews,
});

function Reviews() {
  const qc = useQueryClient();
  const setDirty = useDirtySet();
  const { data: items } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      return (await supabase.from("reviews").select("*").order("display_order")).data ?? [];
    },
  });

  async function add() {
    const nextOrder = Math.max(0, ...(items ?? []).map((item) => item.display_order)) + 1;
    const { error } = await supabase.from("reviews").insert({
      first_name: "Nouveau",
      comment: "À compléter…",
      rating: 5,
      published: false,
      display_order: nextOrder,
      session_type: null,
      review_date: null,
      google_review_url: null,
    });
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <h1 className="font-display text-4xl italic text-primary">Avis clients</h1>
        <button
          type="button"
          onClick={add}
          className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-widest"
        >
          + Ajouter
        </button>
      </header>
      <div className="space-y-4">
        {(items ?? []).map((r) => (
          <ReviewCard key={r.id} item={r} onDirtyChange={(dirty) => setDirty(r.id, dirty)} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  item,
  onDirtyChange,
}: {
  item: ReviewRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const normalizedPatch: ReviewUpdate = { ...patch };
      if (patch.first_name !== undefined) normalizedPatch.first_name = patch.first_name.trim();
      if (patch.comment !== undefined) normalizedPatch.comment = patch.comment.trim();
      if (patch.session_type !== undefined)
        normalizedPatch.session_type = patch.session_type?.trim() || null;
      if (patch.google_review_url !== undefined)
        normalizedPatch.google_review_url = patch.google_review_url?.trim() || null;
      if (patch.review_date !== undefined) normalizedPatch.review_date = patch.review_date || null;

      const { error } = await supabase.from("reviews").update(normalizedPatch).eq("id", item.id);
      if (!error) await qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      return { error };
    },
    onDirtyChange,
  );

  async function saveReview() {
    if (!draft.first_name.trim() || !draft.comment.trim()) {
      toast.error("Renseignez un auteur et un texte pour l'avis.");
      return;
    }
    if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
      toast.error("La note doit être un nombre entier entre 1 et 5.");
      return;
    }
    if (!Number.isInteger(draft.display_order) || draft.display_order < 0) {
      toast.error("L'ordre doit être un nombre entier positif ou zéro.");
      return;
    }
    const googleUrl = draft.google_review_url?.trim() || null;
    if (googleUrl && !isGoogleReviewUrl(googleUrl)) {
      toast.error("Utilisez un lien Google HTTPS valide pour cet avis.");
      return;
    }

    if (await save()) {
      setField("first_name", draft.first_name.trim());
      setField("comment", draft.comment.trim());
      setField("session_type", draft.session_type?.trim() || null);
      setField("google_review_url", googleUrl);
    }
  }

  async function remove() {
    if (!confirmDelete("cet avis")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", item.id);
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    toast.success("Avis supprimé");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  const googleUrl = draft.google_review_url?.trim() || null;
  const invalidGoogleUrl = googleUrl !== null && !isGoogleReviewUrl(googleUrl);
  const googleUrlErrorId = `review-google-url-error-${item.id}`;

  return (
    <div className="bg-surface border border-border p-4 grid sm:grid-cols-2 gap-3 text-sm">
      <label className="grid gap-1">
        <span>Auteur</span>
        <input
          value={draft.first_name}
          onChange={(e) => setField("first_name", e.target.value)}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        <span>Type de séance (facultatif)</span>
        <input
          value={draft.session_type ?? ""}
          onChange={(e) => setField("session_type", e.target.value || null)}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        <span>Note</span>
        <input
          type="number"
          min={1}
          max={5}
          step={1}
          value={draft.rating}
          onChange={(e) => setField("rating", Number(e.target.value))}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        <span>Date de l'avis (facultative)</span>
        <input
          type="date"
          value={draft.review_date ?? ""}
          onChange={(e) => setField("review_date", e.target.value || null)}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        <span>
          Ordre d'affichage
          <FieldHint>position dans la liste : 1 = en premier</FieldHint>
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.display_order}
          onChange={(e) => setField("display_order", Number(e.target.value))}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        <span>
          Lien Google de l'avis (facultatif)
          <FieldHint>adresse de l'avis original sur Google, pour y renvoyer les visiteurs</FieldHint>
        </span>
        <input
          type="url"
          value={draft.google_review_url ?? ""}
          onChange={(e) => setField("google_review_url", e.target.value || null)}
          placeholder="https://share.google/…"
          aria-invalid={invalidGoogleUrl}
          aria-describedby={invalidGoogleUrl ? googleUrlErrorId : undefined}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
        {invalidGoogleUrl && (
          <span id={googleUrlErrorId} className="text-xs text-destructive">
            Utilisez un lien Google HTTPS.
          </span>
        )}
      </label>
      <label className="sm:col-span-2 grid gap-1">
        <span>Texte de l'avis</span>
        <textarea
          value={draft.comment}
          rows={3}
          onChange={(e) => setField("comment", e.target.value)}
          className="min-w-0 bg-background border border-border px-3 py-2"
        />
      </label>
      <label className="sm:col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => setField("published", e.target.checked)}
        />
        Publié
        <FieldHint>visible sur le site</FieldHint>
      </label>
      <div className="sm:col-span-2 flex items-center justify-between">
        <button type="button" onClick={remove} className="text-xs text-destructive hover:underline">
          Supprimer
        </button>
        <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={() => void saveReview()} />
      </div>
    </div>
  );
}
