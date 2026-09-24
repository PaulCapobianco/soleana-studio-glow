import { useEffect, useState } from "react";
import { toast } from "sonner";
import { friendlySupabaseError } from "./friendly-error";

type SaveResult = { error: unknown } | void;

/**
 * Shared "edit one record, save it explicitly" behavior for every admin
 * list page (avis, FAQ, pages SEO, photos, prestations, demandes' status
 * field): holds a local draft, tracks whether it differs from the last
 * saved value, and saves only when `save()` is called — never on blur or
 * change. Shows a success/error toast and reports the current dirty state
 * upward so the page can warn before navigating away with unsaved edits.
 */
export function useEditableRecord<T extends Record<string, unknown>>(
  record: T,
  onSave: (patch: Partial<T>) => Promise<SaveResult>,
  onDirtyChange?: (isDirty: boolean) => void,
) {
  const [draft, setDraft] = useState<T>(record);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = Object.keys(draft).some((key) => draft[key] !== record[key]);

  // If the underlying record changes from outside (another row's save
  // triggered a refetch, etc.) and this row has no pending edits, adopt the
  // fresh value instead of silently overwriting it on the next save.
  useEffect(() => {
    if (!isDirty) setDraft(record);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  function setField<K extends keyof T>(key: K, value: T[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    const patch: Partial<T> = {};
    for (const key of Object.keys(draft) as (keyof T)[]) {
      if (draft[key] !== record[key]) patch[key] = draft[key];
    }
    if (Object.keys(patch).length === 0) return true;

    setIsSaving(true);
    try {
      const result = await onSave(patch);
      if (result && "error" in result && result.error) {
        toast.error(friendlySupabaseError(result.error));
        return false;
      }
      toast.success("Modifications enregistrées");
      return true;
    } catch (err) {
      toast.error(friendlySupabaseError(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function discard() {
    setDraft(record);
  }

  return { draft, setField, isDirty, isSaving, save, discard };
}
