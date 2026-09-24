import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [requests, newRequests, photos, reviews, recent] = await Promise.all([
        supabase.from("contact_requests").select("id", { count: "exact", head: true }),
        supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        total: requests.count ?? 0,
        nouvelles: newRequests.count ?? 0,
        photos: photos.count ?? 0,
        avis: reviews.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">Aperçu</p>
        <h1 className="font-display text-4xl italic text-primary">Tableau de bord</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Demandes reçues" value={stats?.total ?? 0} />
        <Stat label="Non traitées" value={stats?.nouvelles ?? 0} accent />
        <Stat label="Photos publiées" value={stats?.photos ?? 0} />
        <Stat label="Avis affichés" value={stats?.avis ?? 0} />
      </div>

      <section>
        <h2 className="font-display text-2xl italic mb-4">Dernières demandes</h2>
        <div className="bg-surface border border-border divide-y divide-border">
          {(stats?.recent ?? []).map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="font-medium">{r.first_name} {r.last_name}</p>
                <p className="text-xs text-muted-foreground">{r.email} · {r.session_type}</p>
              </div>
              <span className="px-3 py-1 text-[10px] uppercase tracking-widest bg-accent/20 text-accent">{r.status}</span>
            </div>
          ))}
          {(stats?.recent.length ?? 0) === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Aucune demande pour l'instant.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`p-6 border ${accent ? "border-accent bg-accent/5" : "border-border bg-surface"}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{label}</p>
      <p className="font-display text-4xl italic text-foreground">{value}</p>
    </div>
  );
}
