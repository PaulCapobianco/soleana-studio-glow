import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed/pages-seo")({
  head: () => ({ meta: [{ title: "Pages SEO — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: SeoAdmin,
});

function SeoAdmin() {
  const qc = useQueryClient();
  const { data: pages } = useQuery({
    queryKey: ["admin-seo"],
    queryFn: async () => {
      const supabase = await loadSupabaseClient();
      return (await supabase.from("seo_pages").select("*").order("slug")).data ?? [];
    },
  });
  async function update(id: string, patch: Record<string, unknown>) {
    await supabase.from("seo_pages").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-seo"] });
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl italic text-primary">Pages SEO locales</h1>
      <div className="space-y-3">
        {(pages ?? []).map((p) => (
          <details key={p.id} className="bg-surface border border-border">
            <summary className="p-4 cursor-pointer font-display italic">{p.h1}</summary>
            <div className="p-4 border-t border-border grid gap-3">
              <Field label="H1" value={p.h1} onSave={(v) => update(p.id, { h1: v })} />
              <Field label="Meta title" value={p.meta_title} onSave={(v) => update(p.id, { meta_title: v })} />
              <Field label="Meta description" value={p.meta_description} onSave={(v) => update(p.id, { meta_description: v })} />
              <Field label="Intro" value={p.intro} onSave={(v) => update(p.id, { intro: v })} textarea />
              <Field label="Contenu" value={p.content} onSave={(v) => update(p.id, { content: v })} textarea rows={8} />
              <Field label="CTA" value={p.cta_label} onSave={(v) => update(p.id, { cta_label: v })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked={p.published} onChange={(e) => update(p.id, { published: e.target.checked })} /> Publiée</label>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onSave, textarea, rows = 3 }: { label: string; value: string; onSave: (v: string) => void; textarea?: boolean; rows?: number }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea defaultValue={value} rows={rows} onBlur={(e) => e.target.value !== value && onSave(e.target.value)} className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm" />
      ) : (
        <input defaultValue={value} onBlur={(e) => e.target.value !== value && onSave(e.target.value)} className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm" />
      )}
    </div>
  );
}
