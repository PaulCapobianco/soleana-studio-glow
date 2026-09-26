import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HiddenUsernameField } from "@/components/site/admin/HiddenUsernameField";
import { friendlyAuthError, isInsufficientAal } from "@/lib/admin/auth-errors";
import {
  getMfaState,
  needsSecondFactor,
  normalizeTotpCode,
  TOTP_CODE,
  verifyTotp,
} from "@/lib/admin/mfa";
import { validateNewPassword, validatePasswordConfirmation } from "@/lib/admin/password-rules";

export const Route = createFileRoute("/admin/reinitialiser")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPassword,
});

const RECOVERY_FLAG = "soleana-recovery-link";
const inputClass =
  "mt-2 w-full bg-background border border-border px-4 py-3 text-sm focus:border-accent focus:outline-none";
const labelClass = "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";
const buttonClass =
  "w-full bg-primary text-primary-foreground py-3 text-[11px] uppercase tracking-[0.3em] hover:bg-foreground transition-colors disabled:opacity-60";

function readRecoveryFlag(): boolean {
  try {
    return window.sessionStorage.getItem(RECOVERY_FLAG) === "1";
  } catch {
    return false;
  }
}

type Phase = "checking" | "invalid" | "mfa" | "form";

function ResetPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;

    async function check() {
      // getSession attend la fin de l'initialisation (lecture du lien de réinitialisation).
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      // Sans lien de réinitialisation, une session admin ouverte ne doit pas pouvoir changer son
      // mot de passe ici sans connaître l'ancien : le changement normal se fait dans « Mon compte ».
      if (!data.session || !readRecoveryFlag()) {
        setPhase("invalid");
        return;
      }
      setEmail(data.session.user.email ?? "");
      const state = await getMfaState();
      if (!active) return;
      if (needsSecondFactor(state) && state.factorId) {
        setFactorId(state.factorId);
        setPhase("mfa");
      } else {
        setPhase("form");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        try {
          window.sessionStorage.setItem(RECOVERY_FLAG, "1");
        } catch {
          // ignoré
        }
        void check();
      }
    });
    void check().catch(() => active && setPhase("invalid"));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onMfa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = normalizeTotpCode(String(new FormData(e.currentTarget).get("code") ?? ""));
    if (!factorId) return;
    if (!TOTP_CODE.test(code))
      return toast.error("Saisissez le code à 6 chiffres de votre application.");
    setBusy(true);
    const { error } = await verifyTotp(factorId, code);
    setBusy(false);
    if (error) return toast.error(friendlyAuthError(error));
    setPhase("form");
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmation = String(fd.get("confirmation") ?? "");
    const { data: userData } = await supabase.auth.getUser();
    const problem =
      validateNewPassword(password, { email: userData.user?.email }) ??
      validatePasswordConfirmation(password, confirmation);
    if (problem) return toast.error(problem);

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      if (isInsufficientAal(error)) {
        const state = await getMfaState();
        if (state.factorId) {
          setFactorId(state.factorId);
          setPhase("mfa");
        }
      }
      toast.error(friendlyAuthError(error));
      return;
    }
    try {
      window.sessionStorage.removeItem(RECOVERY_FLAG);
    } catch {
      // ignoré
    }
    await supabase.auth.signOut();
    setBusy(false);
    router.navigate({ to: "/admin/login", search: { reason: "reset" } });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-md bg-surface border border-border p-10 space-y-6">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-2">
            Espace privé
          </p>
          <h1 className="font-display text-3xl italic text-primary">Nouveau mot de passe</h1>
        </div>

        {phase === "checking" && (
          <p role="status" className="text-center text-sm">
            Vérification du lien…
          </p>
        )}

        {phase === "invalid" && (
          <div role="alert" className="space-y-4 text-center text-sm">
            <p>Ce lien est invalide ou a expiré.</p>
            <p className="text-muted-foreground">
              Demandez un nouveau lien depuis l&apos;écran de connexion (« Mot de passe oublié ? »).
            </p>
            <Link to="/admin/login" className="inline-block text-xs underline">
              Retour à la connexion
            </Link>
          </div>
        )}

        {phase === "mfa" && (
          <form onSubmit={onMfa} className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Par sécurité, saisissez d&apos;abord le code à 6 chiffres de votre application
              d&apos;authentification.
            </p>
            <div>
              <label htmlFor="reset-code" className={labelClass}>
                Code à 6 chiffres
              </label>
              <input
                id="reset-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                autoFocus
                required
                className={`${inputClass} tracking-[0.4em] text-center`}
              />
            </div>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Vérification…" : "Valider"}
            </button>
          </form>
        )}

        {phase === "form" && (
          <form onSubmit={onPassword} className="space-y-4">
            <HiddenUsernameField email={email} />
            <div>
              <label htmlFor="new-password" className={labelClass}>
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                12 caractères minimum, avec au moins une lettre et un chiffre.
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-password"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
