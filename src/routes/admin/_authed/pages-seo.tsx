import { useId } from "react";
import { AdminValidationError, friendlySupabaseError } from "@/lib/admin/friendly-error";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type SeoPageRow = Database["public"]["Tables"]["seo_pages"]["Row"];
type SeoPageUpdate = Database["public"]["Tables"]["seo_pages"]["Update"];

// Published as-is on the public page (<title>, <meta>, h1, body, button): never empty.
const REQUIRED_FIELDS = [
  ["h1", "H1"],
  ["meta_title", "Meta title"],
  ["meta_description", "Meta description"],
  ["intro", "Intro"],
  ["content", "Contenu"],
  ["cta_label", "CTA"],
] as const;

export const Route = createFileRoute("/admin/_authed/pages-seo")({
  head: () => ({
    meta: [{ title: "Pages SEO — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SeoAdmin,
});

function SeoAdmin() {
  const setDirty = useDirtySet();
  const {
    data: pages,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-seo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_pages").select("*").order("slug");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl italic text-primary">Pages SEO locales</h1>
      {isPending && <p role="status">Chargement des pages…</p>}
      {error && (
        <div role="alert">
          <p>{friendlySupabaseError(error)}</p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="mt-2 underline"
          >
            Réessayer
          </button>
        </div>
      )}
      {!isPending && !error && pages?.length === 0 && <p>Aucune page SEO.</p>}
      <div className="space-y-3">
        {(pages ?? []).map((p) => (
          <SeoPageCard key={p.id} item={p} onDirtyChange={(dirty) => setDirty(p.id, dirty)} />
        ))}
      </div>
    </div>
  );
}

function SeoPageCard({
  item,
  onDirtyChange,
}: {
  item: SeoPageRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const normalizedPatch: SeoPageUpdate = { ...patch };
      for (const [key, label] of REQUIRED_FIELDS) {
        const value = patch[key];
        if (value === undefined) continue;
        if (!value.trim()) {
          return {
            error: new AdminValidationError(`Le champ « ${label} » ne peut pas être vide.`),
          };
        }
        normalizedPatch[key] = value.trim();
      }
      if (patch.og_title !== undefined) normalizedPatch.og_title = patch.og_title?.trim() || null;
      if (patch.og_description !== undefined)
        normalizedPatch.og_description = patch.og_description?.trim() || null;

      const { data, error } = await supabase
        .from("seo_pages")
        .update({ ...normalizedPatch, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .select("*")
        .single();
      if (error) return { error };
      qc.setQueryData<SeoPageRow[]>(["admin-seo"], (pages) =>
        pages?.map((page) => (page.id === item.id ? data : page)),
      );
      return { error: null, record: data };
    },
    onDirtyChange,
  );

  return (
    <details className="bg-surface border border-border">
      <summary className="p-4 cursor-pointer font-display italic">{item.h1}</summary>
      <div className="p-4 border-t border-border grid gap-3">
        <p className="text-sm text-muted-foreground">
          URL : <span className="break-all">/{item.slug}</span>
          <FieldHint>adresse de la page, non modifiable</FieldHint>
        </p>
        <Field
          label="H1"
          hint="titre principal affiché en haut de la page"
          value={draft.h1}
          onChange={(v) => setField("h1", v)}
        />
        <Field
          label="Meta title"
          hint="titre affiché dans l'onglet du navigateur et dans les résultats Google"
          value={draft.meta_title}
          onChange={(v) => setField("meta_title", v)}
          counter={{ min: 50, max: 60 }}
        />
        <Field
          label="Meta description"
          hint="texte de présentation affiché sous le titre dans les résultats Google"
          value={draft.meta_description}
          onChange={(v) => setField("meta_description", v)}
          counter={{ min: 140, max: 160 }}
        />
        <Field
          label="Intro"
          hint="paragraphe d'introduction sous le titre"
          value={draft.intro}
          onChange={(v) => setField("intro", v)}
          textarea
        />
        <Field
          label="Contenu"
          hint="texte principal de la page"
          value={draft.content}
          onChange={(v) => setField("content", v)}
          textarea
          rows={8}
        />
        <Field
          label="CTA"
          hint="texte du bouton d'action, ex. « Réserver une séance »"
          value={draft.cta_label}
          onChange={(v) => setField("cta_label", v)}
        />
        <Field
          label="OG title (Open Graph, facultatif)"
          hint="titre affiché quand la page est partagée sur Facebook, WhatsApp, Instagram… ; si vide, le meta title est utilisé"
          value={draft.og_title ?? ""}
          onChange={(v) => setField("og_title", v)}
          counter={{ min: 50, max: 60 }}
        />
        <Field
          label="OG description (Open Graph, facultative)"
          hint="texte affiché lors d'un partage ; si vide, la meta description est utilisée"
          value={draft.og_description ?? ""}
          onChange={(v) => setField("og_description", v)}
          textarea
          counter={{ min: 140, max: 160 }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setField("published", e.target.checked)}
          />
          Publiée
          <FieldHint>la page est visible sur le site et par Google</FieldHint>
        </label>
        <div className="flex justify-end">
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={save} />
        </div>
      </div>
    </details>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  textarea,
  rows = 3,
  counter,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
  counter?: { min: number; max: number };
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {hint && <FieldHint>{hint}</FieldHint>}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm"
        />
      )}
      {counter && <CharCounter length={value.length} min={counter.min} max={counter.max} />}
    </div>
  );
}

function CharCounter({ length, min, max }: { length: number; min: number; max: number }) {
  const inRange = length >= min && length <= max;
  return (
    <p className={`mt-1 text-[10px] ${inRange ? "text-muted-foreground/70" : "text-orange-500"}`}>
      {length} caractères (recommandé {min}–{max})
    </p>
  );
}
