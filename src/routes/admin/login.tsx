import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  // Explicit `{ reason?: string }` return type (an optional key), not the
  // inferred `{ reason: string | undefined }` (a required key whose value
  // can be undefined) — the latter makes TanStack Router require `search`
  // at every `redirect`/`navigate` call site, even when there's no reason
  // to pass, which is why callers elsewhere were missing it.
  validateSearch: (s: Record<string, unknown>): { reason?: string } => ({
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin — Soleana Studio" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const { reason } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || password.length < 8) {
      toast.error("Email et mot de passe (8+ caractères) requis");
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      router.navigate({ to: "/admin/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin/login" } });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Compte créé. Demandez à l'administrateur de vous attribuer le rôle admin.");
      setMode("login");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-md bg-surface border border-border p-10 space-y-6">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">Espace privé</p>
          <h1 className="font-display text-3xl italic text-primary">Soleana Studio Admin</h1>
        </div>
        {reason === "forbidden" && (
          <p className="text-xs text-destructive bg-destructive/10 p-3 text-center">Accès refusé. Compte sans rôle admin.</p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Email</label>
            <input name="email" type="email" required className="mt-2 w-full bg-background border border-border px-4 py-3 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Mot de passe</label>
            <input name="password" type="password" required minLength={8} className="mt-2 w-full bg-background border border-border px-4 py-3 text-sm focus:border-accent focus:outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 text-[11px] uppercase tracking-[0.3em] hover:bg-foreground transition-colors disabled:opacity-60">
            {loading ? "Patientez…" : mode === "login" ? "Connexion" : "Créer un compte"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
          {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
