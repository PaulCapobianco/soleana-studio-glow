import { useEffect, useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HiddenUsernameField } from "@/components/site/admin/HiddenUsernameField";
import { PasswordVisibilityToggle } from "@/components/site/admin/PasswordVisibilityToggle";
import { friendlyAuthError, isInsufficientAal } from "@/lib/admin/auth-errors";
import { changePassword } from "@/lib/admin/change-password";
import { getMfaState, normalizeTotpCode, TOTP_CODE, type MfaState } from "@/lib/admin/mfa";
import { verifyCurrentPassword } from "@/lib/admin/verify-password";

export const Route = createFileRoute("/admin/_authed/compte")({
  head: () => ({
    meta: [{ title: "Mon compte — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AccountAdmin,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AccountAdmin() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl italic text-primary">Mon compte</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connecté avec <strong className="text-foreground">{email || "…"}</strong>. Ces réglages
          concernent uniquement votre accès à l&apos;administration.
        </p>
      </header>
      <PasswordSection email={email} />
      <EmailSection currentEmail={email} />
      <TotpSection />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border p-5 space-y-4">
      <h2 className="font-display text-2xl italic">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
  inputMode?: "numeric";
  maxLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={isPassword ? (visible ? "text" : "password") : type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-background border border-border px-3 py-2 text-sm ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <PasswordVisibilityToggle visible={visible} onToggle={() => setVisible((v) => !v)} />
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground transition-colors hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// --- Mot de passe -----------------------------------------------------------------------------

export function PasswordSection({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  // Étape facultative : Supabase peut exiger un code reçu par e-mail avant de changer le mot de passe.
  const [needsNonce, setNeedsNonce] = useState(false);
  const [nonce, setNonce] = useState("");

  async function submit() {
    setBusy(true);
    try {
      const result = await changePassword(
        { email, current, next, confirm, needsNonce, nonce },
        {
          verifyCurrentPassword,
          updateUser: (attrs) => supabase.auth.updateUser(attrs),
          reauthenticate: () => supabase.auth.reauthenticate(),
        },
      );

      switch (result.status) {
        case "missing-current":
          toast.error("Saisissez votre mot de passe actuel.");
          return;
        case "wrong-current":
          // Vidé pour ne pas laisser une valeur fausse ou obsolète fausser le prochain essai.
          setCurrent("");
          toast.error("Le mot de passe actuel est incorrect.");
          return;
        case "needs-nonce":
          // Le mot de passe actuel vient d'être vérifié avec succès : on le garde pour le
          // second envoi (avec le code), qui en a de nouveau besoin.
          setNeedsNonce(true);
          toast.message("Un code de confirmation vient d'être envoyé à votre adresse e-mail.");
          return;
        case "error":
          setCurrent("");
          toast.error(result.message);
          return;
        case "success":
          toast.success("Mot de passe modifié.");
          setCurrent("");
          setNext("");
          setConfirm("");
          setNonce("");
          setNeedsNonce(false);
          return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Mot de passe">
      <form
        className="grid gap-3 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <HiddenUsernameField email={email} />
        <Field
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
        />
        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          hint="12 caractères minimum, avec au moins une lettre et un chiffre."
        />
        <Field
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
        {needsNonce && (
          <Field
            label="Code reçu par e-mail"
            value={nonce}
            onChange={setNonce}
            autoComplete="one-time-code"
            hint="Saisissez le code envoyé à votre adresse, puis validez à nouveau."
          />
        )}
        <div>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Changer le mot de passe"}
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );
}

// --- Adresse e-mail ---------------------------------------------------------------------------

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    const value = next.trim();
    if (!EMAIL.test(value)) return toast.error("Adresse e-mail invalide.");
    if (value.toLowerCase() === currentEmail.toLowerCase()) {
      return toast.error("Cette adresse est déjà celle de votre compte.");
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: value },
      { emailRedirectTo: `${window.location.origin}/admin/login` },
    );
    setBusy(false);
    if (error) {
      toast.error(
        isInsufficientAal(error)
          ? "Reconnectez-vous avec votre code d'authentification, puis réessayez."
          : friendlyAuthError(error),
      );
      return;
    }
    setSentTo(value);
    setNext("");
  }

  return (
    <Card title="Adresse e-mail de connexion">
      <form
        className="grid gap-3 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label="Nouvelle adresse e-mail"
          type="email"
          autoComplete="email"
          value={next}
          onChange={setNext}
          hint="C'est l'adresse utilisée pour vous connecter, pas celle affichée sur le site (voir « Paramètres »)."
        />
        <div>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Envoi…" : "Changer l'adresse"}
          </PrimaryButton>
        </div>
      </form>
      {sentTo && (
        <div role="status" className="border border-accent bg-accent/5 p-4 text-sm space-y-2">
          <p className="font-medium">Un e-mail de confirmation a été envoyé.</p>
          <p>
            Ouvrez le message reçu à <strong>{sentTo}</strong> et cliquez sur le lien pour valider
            le changement. Selon la configuration, un second message peut aussi être envoyé à votre
            adresse actuelle : il faut alors valider les deux liens.
          </p>
          <p className="text-muted-foreground">
            Tant que le lien n&apos;est pas validé, votre adresse actuelle reste celle à utiliser
            pour vous connecter.
          </p>
        </div>
      )}
    </Card>
  );
}

// --- Double authentification (TOTP) -----------------------------------------------------------

type Enrollment = { factorId: string; qrCode: string; secret: string };

function TotpSection() {
  const [state, setState] = useState<MfaState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setState(await getMfaState());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startEnrollment() {
    setBusy(true);
    try {
      // Un enrôlement abandonné laisserait un facteur « non vérifié » : on le retire d'abord.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? []) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Soleana Admin ${new Date().toISOString().slice(0, 16)}`,
      });
      if (error || !data) {
        toast.error(friendlyAuthError(error));
        return;
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment) return;
    const clean = normalizeTotpCode(code);
    if (!TOTP_CODE.test(clean)) return toast.error("Saisissez le code à 6 chiffres.");
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: clean,
    });
    setBusy(false);
    if (error) return toast.error(friendlyAuthError(error));
    setEnrollment(null);
    setCode("");
    toast.success("Double authentification activée.");
    await refresh();
  }

  async function cancelEnrollment() {
    if (enrollment) await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setCode("");
  }

  async function disable() {
    if (!state?.factorId) return;
    if (
      !window.confirm(
        "Désactiver la double authentification ? Votre compte ne sera plus protégé que par le mot de passe.",
      )
    ) {
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: state.factorId });
    setBusy(false);
    if (error) {
      toast.error(
        isInsufficientAal(error)
          ? "Reconnectez-vous avec votre code d'authentification, puis réessayez."
          : friendlyAuthError(error),
      );
      return;
    }
    toast.success("Double authentification désactivée.");
    await refresh();
  }

  const enabled = Boolean(state?.factorId);

  return (
    <Card title="Double authentification (application)">
      {loadError && (
        <p role="alert">Impossible de lire l&apos;état de la double authentification.</p>
      )}
      {!state && !loadError && <p role="status">Chargement…</p>}
      {state && (
        <p className="text-sm">
          État :{" "}
          <strong className={enabled ? "text-primary" : "text-destructive"}>
            {enabled ? "activée" : "désactivée"}
          </strong>
        </p>
      )}

      {state && !enabled && !enrollment && (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Après votre mot de passe, l&apos;administration demandera un code à 6 chiffres généré
            par une application (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).
          </p>
          <PrimaryButton disabled={busy} onClick={() => void startEnrollment()}>
            Activer la double authentification
          </PrimaryButton>
        </div>
      )}

      {enrollment && (
        <div className="space-y-4 text-sm">
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Ouvrez votre application d&apos;authentification et ajoutez un compte.</li>
            <li>Scannez ce QR code (ou saisissez la clé ci-dessous).</li>
            <li>Saisissez le code à 6 chiffres affiché, puis validez.</li>
          </ol>
          <img
            src={enrollment.qrCode}
            alt="QR code à scanner avec votre application d'authentification"
            width={192}
            height={192}
            className="bg-white p-2 border border-border"
          />
          <p>
            Clé de secours de configuration :{" "}
            <code className="break-all bg-background px-2 py-1 border border-border">
              {enrollment.secret}
            </code>
          </p>
          <form
            className="grid gap-3 sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmEnrollment();
            }}
          >
            <Field
              label="Code à 6 chiffres"
              value={code}
              onChange={setCode}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
            />
            <div className="flex gap-3">
              <PrimaryButton type="submit" disabled={busy}>
                Valider
              </PrimaryButton>
              <button
                type="button"
                onClick={() => void cancelEnrollment()}
                className="text-xs text-muted-foreground hover:underline"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {state && enabled && (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Un code de votre application est demandé à chaque connexion. Si vous perdez votre
            téléphone, voir la procédure de secours dans la documentation du projet.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disable()}
            className="text-xs text-destructive hover:underline disabled:opacity-40"
          >
            Désactiver la double authentification
          </button>
        </div>
      )}
    </Card>
  );
}
