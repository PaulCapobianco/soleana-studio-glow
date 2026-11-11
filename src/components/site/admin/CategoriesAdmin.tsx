import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { toastAdminError } from "@/lib/admin/write-error";
import {
  PROTECTED_CATEGORY_SLUGS,
  categoryError,
  categorySlugFor,
  deleteBlockReason,
  moveCategory,
  validateCategoryName,
} from "@/lib/photos/categories";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

const KEY = ["admin-categories"];

/** Gestion des catégories de photos : créer, renommer, réordonner, masquer, supprimer. */
export function CategoriesAdmin() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [cats, photos] = await Promise.all([
        supabase.from("categories").select("*").order("display_order").order("name"),
        supabase.from("photos").select("category_id"),
      ]);
      if (cats.error) throw cats.error;
      if (photos.error) throw photos.error;
      const counts = new Map<string, number>();
      for (const p of photos.data ?? []) {
        if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
      }
      return { categories: (cats.data ?? []) as CategoryRow[], counts };
    },
  });

  const categories = useMemo(() => data?.categories ?? [], [data]);
  // Colonne ajoutée par la migration 20261109000000 : absente tant qu'elle n'est pas appliquée.
  const canHide = categories.every((c) => typeof c.published === "boolean");

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["admin-photos"] });
    } catch (err) {
      void toastAdminError(categoryError(err));
    } finally {
      setBusy(null);
    }
  }

  const add = () =>
    run("add", async () => {
      const slug = categorySlugFor(
        newName,
        categories.map((c) => c.slug),
      );
      const order = Math.max(0, ...categories.map((c) => c.display_order)) + 1;
      const { error: insertError } = await supabase
        .from("categories")
        .insert({ name: newName.trim(), slug, display_order: order });
      if (insertError) throw insertError;
      setNewName("");
      toast.success(`Catégorie « ${newName.trim()} » créée.`);
    });

  const rename = (row: CategoryRow, name: string) =>
    run(`rename-${row.id}`, async () => {
      const problem = validateCategoryName(name);
      if (problem) {
        toast.error(problem);
        return;
      }
      const { error: e } = await supabase
        .from("categories")
        .update({ name: name.trim() })
        .eq("id", row.id);
      if (e) throw e;
      toast.success("Nom enregistré.");
    });

  const move = (row: CategoryRow, delta: -1 | 1) =>
    run(`move-${row.id}`, async () => {
      const updates = moveCategory(categories, row.id, delta);
      if (!updates) return;
      for (const u of updates) {
        const { error: e } = await supabase
          .from("categories")
          .update({ display_order: u.display_order })
          .eq("id", u.id);
        if (e) throw e;
      }
    });

  const toggle = (row: CategoryRow) =>
    run(`toggle-${row.id}`, async () => {
      const next = !row.published;
      if (
        !next &&
        !window.confirm(
          `Masquer « ${row.name} » ? Ses photos ne seront plus affichées sur le site, mais elles ne sont pas supprimées. Vous pourrez la réafficher.`,
        )
      ) {
        return;
      }
      const { error: e } = await supabase
        .from("categories")
        .update({ published: next })
        .eq("id", row.id);
      if (e) throw e;
      toast.success(next ? "Catégorie visible sur le site." : "Catégorie masquée.");
    });

  const remove = (row: CategoryRow) =>
    run(`delete-${row.id}`, async () => {
      if (
        !window.confirm(`Supprimer la catégorie « ${row.name} » ? Cette action est définitive.`)
      ) {
        return;
      }
      const { error: e } = await supabase.from("categories").delete().eq("id", row.id);
      if (e) throw e;
      toast.success("Catégorie supprimée.");
    });

  return (
    <details className="border border-border bg-surface p-4 sm:p-6" open={categories.length === 0}>
      <summary className="cursor-pointer font-display text-2xl italic text-primary">
        Catégories de photos
      </summary>
      <div className="mt-4 space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Les catégories classent vos photos (grossesse, famille…). Vous pouvez en créer, les
          renommer, changer leur ordre et les masquer. Les catégories utilisées par le site ne
          peuvent pas être supprimées.
        </p>
        {!canHide && (
          <p className="border border-border bg-background p-3 text-xs">
            Pour masquer une catégorie, une mise à jour de la base de données est d&apos;abord
            nécessaire (migration « gestion des catégories »). Le reste fonctionne déjà.
          </p>
        )}
        {isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {error && (
          <p className="text-sm text-destructive">
            Impossible de charger les catégories ({friendlySupabaseError(error)}){" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Réessayer
            </button>
          </p>
        )}
        <ul className="space-y-2">
          {categories.map((row, index) => (
            <CategoryItem
              key={`${row.id}-${row.name}`}
              row={row}
              count={data?.counts.get(row.id) ?? 0}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              canHide={canHide}
              busy={busy !== null}
              onRename={(name) => void rename(row, name)}
              onMove={(delta) => void move(row, delta)}
              onToggle={() => void toggle(row)}
              onDelete={() => void remove(row)}
            />
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const problem = validateCategoryName(newName);
            if (problem) toast.error(problem);
            else void add();
          }}
        >
          <label className="min-w-64 flex-1 text-xs">
            <span className="font-mono uppercase tracking-widest text-muted-foreground">
              Nouvelle catégorie
              <FieldHint>ex. Mariage, Naissance…</FieldHint>
            </span>
            <input
              value={newName}
              maxLength={80}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy !== null || !newName.trim()}
            className="min-h-11 bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-40"
          >
            {busy === "add" ? "Création…" : "+ Créer"}
          </button>
        </form>
      </div>
    </details>
  );
}

function CategoryItem({
  row,
  count,
  isFirst,
  isLast,
  canHide,
  busy,
  onRename,
  onMove,
  onToggle,
  onDelete,
}: {
  row: CategoryRow;
  count: number;
  isFirst: boolean;
  isLast: boolean;
  canHide: boolean;
  busy: boolean;
  onRename: (name: string) => void;
  onMove: (delta: -1 | 1) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const blocked = deleteBlockReason(row, count);
  const hidden = canHide && !row.published;
  return (
    <li className="flex flex-wrap items-center gap-3 border border-border bg-background p-3">
      <input
        aria-label={`Nom de la catégorie ${row.name}`}
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        className="min-w-48 flex-1 border border-border bg-surface px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={busy || name.trim() === row.name}
        onClick={() => onRename(name)}
        className="text-xs uppercase tracking-widest text-primary hover:underline disabled:opacity-40"
      >
        Renommer
      </button>
      <span className="text-xs text-muted-foreground">
        {count} photo{count > 1 ? "s" : ""}
        {PROTECTED_CATEGORY_SLUGS.includes(row.slug) && " · utilisée par le site"}
        {hidden && " · masquée"}
      </span>
      <span className="flex items-center gap-2 text-xs">
        <button
          type="button"
          aria-label={`Monter ${row.name}`}
          disabled={busy || isFirst}
          onClick={() => onMove(-1)}
          className="px-2 py-1 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Descendre ${row.name}`}
          disabled={busy || isLast}
          onClick={() => onMove(1)}
          className="px-2 py-1 disabled:opacity-30"
        >
          ↓
        </button>
      </span>
      {canHide && (
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className="text-xs text-muted-foreground hover:underline disabled:opacity-40"
        >
          {row.published ? "Masquer" : "Réafficher"}
        </button>
      )}
      <button
        type="button"
        disabled={busy || blocked !== null}
        title={blocked ?? undefined}
        onClick={onDelete}
        className="text-xs text-destructive hover:underline disabled:opacity-30"
      >
        Supprimer
      </button>
    </li>
  );
}
