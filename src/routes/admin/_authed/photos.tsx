import { createFileRoute } from "@tanstack/react-router";
import { PhotosAdmin } from "@/components/admin/PhotosAdmin";

// Le corps de la page vit dans un composant à part : une route qui exporte autre chose que `Route`
// n'est pas découpée par TanStack et finit dans le JavaScript de TOUTES les pages publiques.
export const Route = createFileRoute("/admin/_authed/photos")({
  head: () => ({
    meta: [{ title: "Photos — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PhotosAdmin,
});
