import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";

type SeoPageRow = Database["public"]["Tables"]["seo_pages"]["Row"];
type SeoPageUpdate = Database["public"]["Tables"]["seo_pages"]["Update"];

export const Route = createFileRoute("/admin/_authed/pages-seo")({
  head: () => ({
    meta: [{ title: "Pages SEO — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SeoAdmin,
});

function SeoAdmin() {
  const setDirty = useDirtySet();
  const { data: pages } = useQuery({
    queryKey: ["admin-seo"],
    queryFn: async () => {
      return (await supabase.from("seo_pages").select("*").order("slug")).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl italic text-primary">Pages SEO locales</h1>
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
      if (patch.og_title !== undefined) normalizedPatch.og_title = patch.og_title?.trim() || null;
      if (patch.og_description !== undefined)
        normalizedPatch.og_description = patch.og_description?.trim() || null;

      const { error } = await supabase
        .from("seo_pages")
        .update({ ...normalizedPatch, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-seo"] });
      return { error };
    },
    onDirtyChange,
  );

  return (
    <details className="bg-surface border border-border">
      <summary className="p-4 cursor-pointer font-display italic">{item.h1}</summary>
      <div className="p-4 border-t border-border grid gap-3">
        <Field label="H1" value={draft.h1} onChange={(v) => setField("h1", v)} />
        <Field
          label="Meta title"
          value={draft.meta_title}
          onChange={(v) => setField("meta_title", v)}
        />
        <Field
          label="Meta description"
          value={draft.meta_description}
          onChange={(v) => setField("meta_description", v)}
        />
        <Field label="Intro" value={draft.intro} onChange={(v) => setField("intro", v)} textarea />
        <Field
          label="Contenu"
          value={draft.content}
          onChange={(v) => setField("content", v)}
          textarea
          rows={8}
        />
        <Field label="CTA" value={draft.cta_label} onChange={(v) => setField("cta_label", v)} />
        <Field
          label="OG title (Open Graph, facultatif)"
          value={draft.og_title ?? ""}
          onChange={(v) => setField("og_title", v)}
        />
        <Field
          label="OG description (Open Graph, facultative)"
          value={draft.og_description ?? ""}
          onChange={(v) => setField("og_description", v)}
          textarea
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setField("published", e.target.checked)}
          />
          Publiée
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
  value,
  onChange,
  textarea,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
