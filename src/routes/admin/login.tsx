import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PasswordVisibilityToggle } from "@/components/site/admin/PasswordVisibilityToggle";
import { friendlyAuthError } from "@/lib/admin/auth-errors";
import {
  getMfaState,
  needsSecondFactor,
  normalizeTotpCode,
  TOTP_CODE,
  verifyTotp,
} from "@/lib/admin/mfa";

export const Route = createFileRoute("/admin/login")({
  // Explicit `{ reason?: string }` return type (an optional key), not the
  // inferred `{ reason: string | undefined }` (a required key whose value
  // can be undefined) — the latter makes TanStack Router require `search`
  // at every `redirect`/`navigate` call site, even when there's no reason
  // to pass, which is why callers elsewhere were missing it.
  validateSearch: (s: Record<string, unknown>): { reason?: string } => ({
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
  head: () => ({
    meta: [{ title: "Admin — Soleana Studio" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLogin,
});

type Mode = "login" | "mfa" | "forgot" | "forgot-sent";

const inputClass =
  "mt-2 w-full bg-background border border-border px-4 py-3 text-sm focus:border-accent focus:outline-none";
const labelClass = "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";
const buttonClass =
  "w-full bg-primary text-primary-foreground py-3 text-[11px] uppercase tracking-[0.3em] hover:bg-foreground transition-colors disabled:opacity-60";
const linkClass = "block w-full text-center text-xs text-muted-foreground hover:text-foreground";

function AdminLogin() {
  const router = useRouter();
  const { reason } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("login");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const codeId = useId();

  // Session déjà ouverte mais second facteur non saisi (retour depuis une page admin, actualisation).
  useEffect(() => {
    let active = true;
    void getMfaState()
      .then((state) => {
        if (active && needsSecondFactor(state) && state.factorId) {
          setFactorId(state.factorId);
          setMode("mfa");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function afterPassword() {
    const state = await getMfaState();
    if (needsSecondFactor(state) && state.factorId) {
      setFactorId(state.factorId);
      setMode("mfa");
      return;
    }
    router.navigate({ to: "/admin/dashboard" });
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      toast.error("Email et mot de passe requis");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(friendlyAuthError(error));
      return;
    }
    try {
      await afterPassword();
    } catch {
      toast.error("Connexion impossible pour le moment. Réessayez dans un instant.");
    }
    setLoading(false);
  }

  async function onMfa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = normalizeTotpCode(String(new FormData(e.currentTarget).get("code") ?? ""));
    if (!factorId) return;
    if (!TOTP_CODE.test(code)) {
      toast.error("Saisissez le code à 6 chiffres de votre application.");
      return;
    }
    setLoading(true);
    const { error } = await verifyTotp(factorId, code);
    setLoading(false);
    if (error) {
      toast.error(friendlyAuthError(error));
      return;
    }
    router.navigate({ to: "/admin/dashboard" });
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      toast.error("Saisissez votre adresse e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reinitialiser`,
    });
    setLoading(false);
    // Même réponse que l'adresse existe ou non : on ne révèle pas quels comptes existent.
    if (
      error &&
      ["over_request_rate_limit", "over_email_send_rate_limit"].includes(String(error.code))
    ) {
      toast.error(friendlyAuthError(error));
      return;
    }
    setMode("forgot-sent");
  }

  async function backToLogin() {
    await supabase.auth.signOut();
    setFactorId(null);
    setMode("login");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-md bg-surface border border-border p-10 space-y-6">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">
            Espace privé
          </p>
          <h1 className="font-display text-3xl italic text-primary">Soleana Studio Admin</h1>
        </div>

        {mode === "login" && reason === "forbidden" && (
          <p className="text-xs text-destructive bg-destructive/10 p-3 text-center">
            Accès refusé. Compte sans rôle admin.
          </p>
        )}
        {mode === "login" && reason === "reset" && (
          <p role="status" className="text-xs text-primary bg-primary/10 p-3 text-center">
            Mot de passe mis à jour. Connectez-vous avec le nouveau.
          </p>
        )}

        {mode === "login" && (
          <>
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="admin-password" className={labelClass}>
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className={`${inputClass} pr-11`}
                  />
                  <PasswordVisibilityToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Patientez…" : "Connexion"}
              </button>
            </form>
            <button type="button" onClick={() => setMode("forgot")} className={linkClass}>
              Mot de passe oublié ?
            </button>
          </>
        )}

        {mode === "mfa" && (
          <>
            <form onSubmit={onMfa} className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Saisissez le code à 6 chiffres affiché par votre application
                d&apos;authentification.
              </p>
              <div>
                <label htmlFor={codeId} className={labelClass}>
                  Code à 6 chiffres
                </label>
                <input
                  id={codeId}
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  autoFocus
                  required
                  className={`${inputClass} tracking-[0.4em] text-center`}
                />
              </div>
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Vérification…" : "Valider"}
              </button>
            </form>
            <button type="button" onClick={() => void backToLogin()} className={linkClass}>
              Retour à la connexion
            </button>
          </>
        )}

        {mode === "forgot" && (
          <>
            <form onSubmit={onForgot} className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Saisissez l&apos;adresse de votre compte : vous recevrez un lien pour choisir un
                nouveau mot de passe.
              </p>
              <div>
                <label htmlFor="forgot-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
            <button type="button" onClick={() => setMode("login")} className={linkClass}>
              Retour à la connexion
            </button>
          </>
        )}

        {mode === "forgot-sent" && (
          <>
            <div role="status" className="text-sm text-center space-y-2">
              <p className="font-medium">Vérifiez votre boîte e-mail.</p>
              <p className="text-muted-foreground">
                Si un compte existe pour cette adresse, un lien de réinitialisation vient
                d&apos;être envoyé. Pensez à regarder dans les courriers indésirables.
              </p>
            </div>
            <button type="button" onClick={() => setMode("login")} className={linkClass}>
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
