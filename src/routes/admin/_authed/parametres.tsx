import { useId } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";
import { validateSiteSettings } from "@/lib/admin/site-settings-validation";

type SettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];
type SettingsUpdate = Database["public"]["Tables"]["site_settings"]["Update"];

export const Route = createFileRoute("/admin/_authed/parametres")({
  head: () => ({
    meta: [{ title: "Paramètres — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const setDirty = useDirtySet();
  const {
    data: row,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl italic text-primary">Paramètres du studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coordonnées et liens affichés sur le site (pied de page, contact, mentions légales…).
        </p>
      </header>
      {isPending && <p role="status">Chargement…</p>}
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
      {!isPending && !error && !row && <p>Aucun réglage enregistré (ligne introuvable).</p>}
      {row && (
        <SettingsForm item={row} onDirtyChange={(dirty) => setDirty(String(row.id), dirty)} />
      )}
    </div>
  );
}

function SettingsForm({
  item,
  onDirtyChange,
}: {
  item: SettingsRow;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    item,
    async (patch) => {
      const normalized: SettingsUpdate = { ...patch, updated_at: new Date().toISOString() };
      if (patch.email !== undefined) normalized.email = patch.email.trim();
      if (patch.service_area !== undefined) normalized.service_area = patch.service_area.trim();
      if (patch.footer_text !== undefined) normalized.footer_text = patch.footer_text.trim();
      for (const key of [
        "phone",
        "instagram_url",
        "tiktok_url",
        "whatsapp_url",
        "google_review_url",
      ] as const) {
        if (patch[key] !== undefined) normalized[key] = patch[key]?.trim() || null;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .update(normalized)
        .eq("id", item.id)
        .select("*")
        .single();
      if (error) return { error };
      qc.setQueryData<SettingsRow | null>(["admin-site-settings"], data);
      return { error: null, record: data };
    },
    onDirtyChange,
  );

  const errors = validateSiteSettings({
    email: draft.email,
    phone: draft.phone,
    instagram_url: draft.instagram_url,
    tiktok_url: draft.tiktok_url,
    whatsapp_url: draft.whatsapp_url,
    google_review_url: draft.google_review_url,
    service_area: draft.service_area,
    footer_text: draft.footer_text,
  });

  async function saveSettings() {
    const first = Object.values(errors)[0];
    if (first) {
      toast.error(first);
      return;
    }
    await save();
  }

  return (
    <div className="bg-surface border border-border p-4 grid gap-4 sm:grid-cols-2">
      <Field
        label="E-mail de contact"
        type="email"
        value={draft.email}
        error={errors.email}
        onChange={(v) => setField("email", v)}
      />
      <Field
        label="Téléphone (tel qu'affiché)"
        value={draft.phone ?? ""}
        error={errors.phone}
        placeholder="06.67.53.63.12"
        onChange={(v) => setField("phone", v || null)}
      />
      <Field
        label="Instagram (lien)"
        type="url"
        value={draft.instagram_url ?? ""}
        error={errors.instagram_url}
        placeholder="https://instagram.com/…"
        onChange={(v) => setField("instagram_url", v || null)}
      />
      <Field
        label="TikTok (lien)"
        type="url"
        value={draft.tiktok_url ?? ""}
        error={errors.tiktok_url}
        placeholder="https://www.tiktok.com/@…"
        onChange={(v) => setField("tiktok_url", v || null)}
      />
      <Field
        label="WhatsApp (lien)"
        type="url"
        value={draft.whatsapp_url ?? ""}
        error={errors.whatsapp_url}
        placeholder="https://wa.me/33…"
        onChange={(v) => setField("whatsapp_url", v || null)}
      />
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          checked={draft.whatsapp_enabled}
          onChange={(e) => setField("whatsapp_enabled", e.target.checked)}
        />
        Afficher WhatsApp sur le site
      </label>
      <div className="sm:col-span-2">
        <Field
          label="Lien pour laisser un avis Google"
          type="url"
          value={draft.google_review_url ?? ""}
          error={errors.google_review_url}
          placeholder="https://g.page/r/…/review"
          onChange={(v) => setField("google_review_url", v || null)}
        />
      </div>
      <div className="sm:col-span-2">
        <Field
          label="Zone d'intervention"
          hint="affichée sur la page d'accueil et utilisée par Google pour savoir où vous intervenez"
          value={draft.service_area}
          error={errors.service_area}
          onChange={(v) => setField("service_area", v)}
        />
      </div>
      <div className="sm:col-span-2">
        <Field
          label="Phrase du pied de page"
          hint="texte affiché tout en bas de chaque page du site"
          value={draft.footer_text}
          error={errors.footer_text}
          textarea
          onChange={(v) => setField("footer_text", v)}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={() => void saveSettings()} />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  error,
  type = "text",
  textarea,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const common = {
    id,
    value,
    placeholder,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    className: "mt-1 w-full bg-background border border-border px-3 py-2 text-sm",
  };
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
        <textarea rows={3} onChange={(e) => onChange(e.target.value)} {...common} />
      ) : (
        <input type={type} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
