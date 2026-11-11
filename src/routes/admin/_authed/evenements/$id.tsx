import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EventEditor } from "@/components/admin/EventEditor";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { getEvent } from "@/lib/events/admin";

export const Route = createFileRoute("/admin/_authed/evenements/$id")({
  head: () => ({
    meta: [
      { title: "Modifier un événement — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EventEditPage,
});

function EventEditPage() {
  const { id } = Route.useParams();
  const {
    data: row,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: () => getEvent(id),
  });

  return (
    <div className="space-y-6">
      <Link
        to="/admin/evenements"
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Tous les événements
      </Link>
      {isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger cet événement ({friendlySupabaseError(error)})
          <button type="button" onClick={() => void refetch()} className="ml-2 underline">
            Réessayer
          </button>
        </div>
      )}
      {!isPending && !error && !row && <p>Cet événement n&apos;existe pas (ou plus).</p>}
      {row && <EventEditor key={row.id} initial={row} />}
    </div>
  );
}
