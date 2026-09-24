import { createCsrfMiddleware, createServerFn } from "@tanstack/react-start";
import { contactFormSchema } from "../contact-form.schema";

const contactCsrfMiddleware = createCsrfMiddleware();

type TurnstileVerifyResponse = {
  success: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

async function verifyTurnstileToken(token: string, requestHostname: string) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("La vérification anti-spam n'est pas configurée.");
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  });

  if (!response.ok) {
    throw new Error("Impossible de vérifier la protection anti-spam.");
  }

  const result = (await response.json()) as TurnstileVerifyResponse;

  if (!result.success) {
    throw new Error("La vérification anti-spam a échoué. Merci de réessayer.");
  }

  if (result.hostname && result.hostname !== requestHostname) {
    throw new Error("La vérification anti-spam a échoué. Merci de réessayer.");
  }
}

export const submitContactRequest = createServerFn({ method: "POST" })
  .middleware([contactCsrfMiddleware])
  .inputValidator(contactFormSchema)
  .handler(async ({ data }) => {
    if (data.website?.trim()) {
      throw new Error("Soumission invalide.");
    }

    const submittedAt = Number.parseInt(data.submitted_at, 10);
    if (!Number.isFinite(submittedAt)) {
      throw new Error("Soumission invalide.");
    }

    const elapsedMs = Date.now() - submittedAt;
    if (elapsedMs < 1200) {
      throw new Error("Soumission trop rapide. Merci de réessayer.");
    }
    if (elapsedMs > 1000 * 60 * 60 * 24) {
      throw new Error("Le formulaire a expiré. Merci de le recharger.");
    }

    const { getRequest } = await import("@tanstack/react-start/server");
    const requestHostname = new URL(getRequest().url).hostname;

    await verifyTurnstileToken(data.turnstile_token, requestHostname);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("contact_requests").insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      session_type: data.session_type,
      desired_date: data.desired_date ?? null,
      location: data.location ?? null,
      message: data.message,
      consent: data.consent,
      status: "nouveau",
    });

    if (error) {
      throw new Error("Impossible d'enregistrer votre demande pour le moment.");
    }

    return {
      ok: true as const,
    };
  });
