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

const STATUSES = ["nouveau", "repondu", "reserve", "termine", "archive"] as const;

type ContactRequestRow = Database["public"]["Tables"]["contact_requests"]["Row"];

export const Route = createFileRoute("/admin/_authed/demandes")({
  head: () => ({
    meta: [{ title: "Demandes — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Demandes,
});

function Demandes() {
  const setDirty = useDirtySet();
  const { data: items } = useQuery({
    queryKey: ["admin-demandes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl italic text-primary">Demandes de contact</h1>
      </header>
      <div className="space-y-3">
        {(items ?? []).map((r) => (
          <DemandeCard key={r.id} item={r} onDirtyChange={(dirty) => setDirty(r.id, dirty)} />
        ))}
        {(items?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground p-8 text-center bg-surface border border-border">
            Aucune demande pour l'instant.
          </p>
        )}
      </div>
    </div>
  );
}

function DemandeCard({
  item,
  onDirtyChange,
}: {
  item: ContactRequestRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const { error } = await supabase.from("contact_requests").update(patch).eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-demandes"] });
      return { error };
    },
    onDirtyChange,
  );

  async function remove() {
    if (!confirmDelete("cette demande")) return;
    const { error } = await supabase.from("contact_requests").delete().eq("id", item.id);
    if (error) {
      toast.error(friendlySupabaseError(error));
      return;
    }
    toast.success("Demande supprimée");
    qc.invalidateQueries({ queryKey: ["admin-demandes"] });
  }

  return (
    <details className="bg-surface border border-border">
      <summary className="cursor-pointer p-4 flex flex-wrap gap-4 items-center justify-between list-none">
        <div>
          <p className="font-medium">
            {item.first_name} {item.last_name}{" "}
            <span className="text-muted-foreground text-sm">· {item.session_type}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleString("fr-FR")}
          </p>
        </div>
        <select
          value={draft.status}
          onChange={(e) => setField("status", e.target.value as (typeof STATUSES)[number])}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border border-border px-3 py-1 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </summary>
      <div className="p-4 border-t border-border space-y-2 text-sm">
        <p>
          <strong>Email :</strong>{" "}
          <a href={`mailto:${item.email}`} className="text-accent">
            {item.email}
          </a>
        </p>
        {item.phone && (
          <p>
            <strong>Téléphone :</strong> {item.phone}
          </p>
        )}
        <p>
          <strong>Consentement :</strong> {item.consent ? "Oui" : "Non"}
        </p>
        {item.desired_date && (
          <p>
            <strong>Date souhaitée :</strong> {item.desired_date}
          </p>
        )}
        {item.location && (
          <p>
            <strong>Lieu :</strong> {item.location}
          </p>
        )}
        <p className="pt-2 whitespace-pre-line text-muted-foreground">{item.message}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={remove} className="text-xs text-destructive hover:underline">
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={save} />
        </div>
      </div>
    </details>
  );
}
