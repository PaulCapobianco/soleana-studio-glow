import { useCallback, useRef } from "react";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

/**
 * Tracks which rows on an admin list page currently have unsaved edits and
 * arms `useUnsavedChangesGuard` while that set is non-empty. Kept in a ref
 * (not state) since it only needs to be read at navigation time, not
 * re-rendered on every keystroke.
 */
export function useDirtySet() {
  const dirtyIds = useRef<Set<string>>(new Set());

  const setDirty = useCallback((id: string, isDirty: boolean) => {
    if (isDirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);

  useUnsavedChangesGuard(() => dirtyIds.current.size > 0);

  return setDirty;
}
