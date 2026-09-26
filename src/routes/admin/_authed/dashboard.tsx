import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed/dashboard")({
  head: () => ({
    meta: [{ title: "Tableau de bord — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [photos, reviews] = await Promise.all([
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("published", true),
      ]);
      return {
        photos: photos.count ?? 0,
        avis: reviews.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">Aperçu</p>
        <h1 className="font-display text-4xl italic text-primary">Tableau de bord</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Photos publiées" value={stats?.photos ?? 0} />
        <Stat label="Avis affichés" value={stats?.avis ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-6 border border-border bg-surface">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className="font-display text-4xl italic text-foreground">{value}</p>
    </div>
  );
}
