import { useBlocker } from "@tanstack/react-router";

const MESSAGE =
  "Des modifications ne sont pas enregistrées. Quitter cette page sans les enregistrer ?";

/**
 * Warns before leaving a page that has unsaved edits: a native confirm for
 * in-app navigation (clicking a nav link, going back), and the browser's own
 * prompt for closing the tab or reloading. `hasUnsavedChanges` is read at
 * the moment navigation is attempted, not on every render.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: () => boolean) {
  useBlocker({
    shouldBlockFn: () => {
      if (!hasUnsavedChanges()) return false;
      return !window.confirm(MESSAGE);
    },
    enableBeforeUnload: () => hasUnsavedChanges(),
  });
}
