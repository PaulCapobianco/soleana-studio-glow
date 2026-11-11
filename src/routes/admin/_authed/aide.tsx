import { createFileRoute } from "@tanstack/react-router";
import { AdminGuide } from "@/components/admin/AdminGuide";

// Une route n'exporte que `Route` (voir src/routes/README.md) : le contenu est dans le composant.
export const Route = createFileRoute("/admin/_authed/aide")({
  head: () => ({
    meta: [{ title: "Aide — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminGuide,
});
