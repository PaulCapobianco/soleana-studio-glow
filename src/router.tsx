import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ErrorComponent, NotFoundComponent } from "./routes/__root";

// Le lien de réinitialisation arrive avec "#…type=recovery" ; le client d'authentification
// efface ce fragment dès son initialisation. On garde donc une trace (dans l'onglet seulement)
// pour que la page /admin/reinitialiser n'accepte que les sessions issues d'un tel lien.
function rememberRecoveryLink() {
  if (typeof window === "undefined") return;
  if (
    window.location.pathname === "/admin/reinitialiser" &&
    /type=recovery/.test(window.location.hash + window.location.search)
  ) {
    try {
      window.sessionStorage.setItem("soleana-recovery-link", "1");
    } catch {
      // stockage indisponible : la page affichera « lien invalide », sans risque.
    }
  }
}

export const getRouter = () => {
  rememberRecoveryLink();
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
