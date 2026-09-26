import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout only: /portfolio (index) and /portfolio/<categorie> render inside the outlet.
export const Route = createFileRoute("/portfolio")({
  component: () => <Outlet />,
});
