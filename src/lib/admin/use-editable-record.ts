import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { friendlySupabaseError } from "./friendly-error";

type SaveResult<T> = { error: unknown; record?: T } | void;

/**
 * Shared "edit one record, save it explicitly" behavior for every admin
 * list page (avis, FAQ, pages SEO, photos, prestations):
 * holds a local draft, tracks whether it differs from the last
 * saved value, and saves only when `save()` is called — never on blur or
 * change. Shows a success/error toast and reports the current dirty state
 * upward so the page can warn before navigating away with unsaved edits.
 */
export function useEditableRecord<T extends Record<string, unknown>>(
  record: T,
  onSave: (patch: Partial<T>) => Promise<SaveResult<T>>,
  onDirtyChange?: (isDirty: boolean) => void,
) {
  const [draft, setDraft] = useState<T>(record);
  const [baseline, setBaseline] = useState<T>(record);
  const previousRecord = useRef(record);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = Object.keys(draft).some((key) => draft[key] !== baseline[key]);

  // Refresh untouched fields while preserving edits made in this tab.
  useEffect(() => {
    const previous = previousRecord.current;
    if (Object.keys(record).every((key) => record[key] === previous[key])) return;
    previousRecord.current = record;
    setDraft((current) => {
      const next = { ...current };
      for (const key of Object.keys(record) as (keyof T)[]) {
        if (current[key] === previous[key]) next[key] = record[key];
      }
      return next;
    });
    setBaseline(record);
  }, [record]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  function setField<K extends keyof T>(key: K, value: T[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    if (savingRef.current) return false;
    const submitted = draft;
    const patch: Partial<T> = {};
    for (const key of Object.keys(draft) as (keyof T)[]) {
      if (draft[key] !== baseline[key]) patch[key] = draft[key];
    }
    if (Object.keys(patch).length === 0) return true;

    savingRef.current = true;
    setIsSaving(true);
    try {
      const result = await onSave(patch);
      if (result && "error" in result && result.error) {
        toast.error(friendlySupabaseError(result.error));
        return false;
      }
      const saved = result?.record ?? submitted;
      setBaseline(saved);
      setDraft((current) => {
        const next = { ...current };
        for (const key of Object.keys(saved) as (keyof T)[]) {
          if (current[key] === submitted[key]) next[key] = saved[key];
        }
        return next;
      });
      toast.success("Modifications enregistrées");
      return true;
    } catch (err) {
      toast.error(friendlySupabaseError(err));
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function discard() {
    setDraft(baseline);
  }

  return { draft, setField, isDirty, isSaving, save, discard };
}
