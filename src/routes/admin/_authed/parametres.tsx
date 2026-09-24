import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_authed/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Params,
});

function Params() {
  const qc = useQueryClient();
  const { data: s } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const supabase = await loadSupabaseClient();
      return (await supabase.from("site_settings").select("*").eq("id", 1).single()).data;
    },
  });
  async function update(patch: Record<string, unknown>) {
    const { error } = await supabase.from("site_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Enregistré");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  }
  if (!s) return null;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl italic text-primary">Paramètres généraux</h1>
      <div className="bg-surface border border-border p-6 grid sm:grid-cols-2 gap-4">
        <F label="Nom du studio" v={s.studio_name} onS={(v) => update({ studio_name: v })} />
        <F label="Email" v={s.email} onS={(v) => update({ email: v })} />
        <F label="Téléphone" v={s.phone ?? ""} onS={(v) => update({ phone: v })} />
        <F label="Instagram" v={s.instagram_url ?? ""} onS={(v) => update({ instagram_url: v })} />
        <F label="WhatsApp" v={s.whatsapp_url ?? ""} onS={(v) => update({ whatsapp_url: v })} />
        <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={s.whatsapp_enabled} onChange={(e) => update({ whatsapp_enabled: e.target.checked })} /> Bouton WhatsApp activé</label>
        <F label="Zone de déplacement" v={s.service_area} onS={(v) => update({ service_area: v })} />
        <F label="Google Business" v={s.google_business_url ?? ""} onS={(v) => update({ google_business_url: v })} />
        <T label="Texte du footer" v={s.footer_text} onS={(v) => update({ footer_text: v })} />
        <T label="Mentions légales" v={s.legal_info ?? ""} onS={(v) => update({ legal_info: v })} />
      </div>
    </div>
  );
}
function F({ label, v, onS }: { label: string; v: string; onS: (v: string) => void }) {
  return (<div><label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label><input defaultValue={v} onBlur={(e) => e.target.value !== v && onS(e.target.value)} className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm" /></div>);
}
function T({ label, v, onS }: { label: string; v: string; onS: (v: string) => void }) {
  return (<div className="sm:col-span-2"><label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label><textarea defaultValue={v} rows={3} onBlur={(e) => e.target.value !== v && onS(e.target.value)} className="mt-1 w-full bg-background border border-border px-3 py-2 text-sm" /></div>);
}
