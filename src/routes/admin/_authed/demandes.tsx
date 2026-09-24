import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUSES = ["nouveau", "repondu", "reserve", "termine", "archive"] as const;

export const Route = createFileRoute("/admin/_authed/demandes")({
  head: () => ({
    meta: [{ title: "Demandes — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Demandes,
});

function Demandes() {
  const qc = useQueryClient();
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

  async function updateStatus(id: string, status: (typeof STATUSES)[number]) {
    const { error } = await supabase.from("contact_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-demandes"] });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette demande ?")) return;
    await supabase.from("contact_requests").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-demandes"] });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl italic text-primary">Demandes de contact</h1>
      </header>
      <div className="space-y-3">
        {(items ?? []).map((r) => (
          <details key={r.id} className="bg-surface border border-border">
            <summary className="cursor-pointer p-4 flex flex-wrap gap-4 items-center justify-between list-none">
              <div>
                <p className="font-medium">
                  {r.first_name} {r.last_name}{" "}
                  <span className="text-muted-foreground text-sm">· {r.session_type}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <select
                value={r.status}
                onChange={(e) =>
                  updateStatus(r.id, e.target.value as (typeof STATUSES)[number])
                }
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
                <a href={`mailto:${r.email}`} className="text-accent">
                  {r.email}
                </a>
              </p>
              {r.phone && (
                <p>
                  <strong>Téléphone :</strong> {r.phone}
                </p>
              )}
              <p>
                <strong>Consentement :</strong> {r.consent ? "Oui" : "Non"}
              </p>
              {r.desired_date && (
                <p>
                  <strong>Date souhaitée :</strong> {r.desired_date}
                </p>
              )}
              {r.location && (
                <p>
                  <strong>Lieu :</strong> {r.location}
                </p>
              )}
              <p className="pt-2 whitespace-pre-line text-muted-foreground">{r.message}</p>
              <button
                onClick={() => remove(r.id)}
                className="mt-3 text-xs text-destructive hover:underline"
              >
                Supprimer
              </button>
            </div>
          </details>
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
