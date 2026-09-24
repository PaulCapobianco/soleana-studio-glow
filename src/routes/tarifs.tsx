import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tarifs")({
  beforeLoad: () => {
    throw redirect({ to: "/prestations", replace: true });
  },
});
