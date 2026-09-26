import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ErrorComponent, NotFoundComponent } from "./routes/__root";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Routes that throw without their own errorComponent (prestations, faq…) get the
    // neutral French screen instead of TanStack's English "Show Error" fallback.
    defaultErrorComponent: ErrorComponent,
    // Unknown URLs under a layout route (e.g. /portfolio/xyz) otherwise show TanStack's
    // English "Not Found" without a heading.
    defaultNotFoundComponent: NotFoundComponent,
  });

  return router;
};
