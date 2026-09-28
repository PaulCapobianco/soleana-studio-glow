import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleReviewUrl } from "@/lib/google-review-url";

export type SiteSettings = {
  email: string;
  /** Numéro tel qu'affiché (ex. 06.67.53.63.12). */
  phone: string;
  /** Lien tel: dérivé du numéro affiché (ex. tel:+33667536312). */
  phoneHref: string;
  /** null = ne pas afficher WhatsApp. */
  whatsappUrl: string | null;
  instagramUrl: string;
  tiktokUrl: string;
  googleReviewUrl: string;
  serviceArea: string;
  /** Zone d'intervention découpée pour le JSON-LD. */
  areaServed: string[];
  footerText: string;
  /** Adresse de l'éditeur pour les mentions légales. Vide = ligne non affichée. */
  legalInfo: string;
};

// Valeurs affichées avant l'existence de la table : elles servent de repli si la lecture échoue
// ou si un champ est vide, pour que le site reste identique.
const FALLBACK_PHONE = "06.67.53.63.12";
export const SITE_SETTINGS_FALLBACK: SiteSettings = {
  email: "contact@soleanastudio.fr",
  phone: FALLBACK_PHONE,
  phoneHref: "tel:+33667536312",
  whatsappUrl: "https://wa.me/33667536312",
  instagramUrl: "https://instagram.com/soleana.studio",
  tiktokUrl: "https://www.tiktok.com/@soleana.studio",
  googleReviewUrl: "https://g.page/r/CRyE27TfkuhmEBM/review",
  serviceArea: "Marseille · Aubagne · Cassis · La Ciotat · Provence",
  areaServed: ["Marseille", "Aubagne", "Cassis", "La Ciotat", "Provence"],
  footerText:
    "Des images naturelles et lumineuses pour garder une trace des instants qui comptent.",
  legalInfo: "",
};

// Adresse par défaut de la migration initiale, jamais mise à jour : ce n'est pas une vraie valeur.
const LEGACY_PLACEHOLDER_EMAIL = "hello@soleana-studio.com";

/** 06.67.53.63.12 -> tel:+33667536312 ; +33 6 67… et 0033… acceptés. */
export function phoneToHref(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) digits = `+33${digits.slice(1)}`;
  else if (!digits.startsWith("+")) digits = `+${digits}`;
  return `tel:${digits}`;
}

const text = (value: string | null | undefined) => value?.trim() || null;
const httpsLink = (value: string | null | undefined) => {
  const v = text(value);
  return v?.startsWith("https://") ? v : null;
};

type SettingsRow = Partial<{
  email: string | null;
  phone: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  whatsapp_enabled: boolean | null;
  google_review_url: string | null;
  service_area: string | null;
  footer_text: string | null;
  legal_info: string | null;
}>;

/** Fusionne la ligne lue en base avec le repli : toute valeur absente ou vide retombe sur le code. */
export function resolveSiteSettings(row: SettingsRow | null | undefined): SiteSettings {
  const f = SITE_SETTINGS_FALLBACK;
  if (!row) return f;

  const email = text(row.email);
  const phone = text(row.phone);
  const whatsapp = httpsLink(row.whatsapp_url);
  const serviceArea = text(row.service_area);
  const google = text(row.google_review_url);

  return {
    email: email && email !== LEGACY_PLACEHOLDER_EMAIL ? email : f.email,
    phone: phone ?? f.phone,
    phoneHref: phone ? phoneToHref(phone) : f.phoneHref,
    // Sans lien enregistré : repli (affiché). Avec un lien : l'interrupteur décide.
    whatsappUrl: whatsapp ? (row.whatsapp_enabled ? whatsapp : null) : f.whatsappUrl,
    instagramUrl: httpsLink(row.instagram_url) ?? f.instagramUrl,
    tiktokUrl: httpsLink(row.tiktok_url) ?? f.tiktokUrl,
    googleReviewUrl: isGoogleReviewUrl(google) ? google : f.googleReviewUrl,
    serviceArea: serviceArea ?? f.serviceArea,
    areaServed: serviceArea
      ? serviceArea
          .split("·")
          .map((part) => part.trim())
          .filter(Boolean)
      : f.areaServed,
    footerText: text(row.footer_text) ?? f.footerText,
    legalInfo: text(row.legal_info) ?? f.legalInfo,
  };
}

/** Lecture publique (rôle anon), jamais bloquante : en cas d'erreur, valeurs de repli. */
export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[site_settings] Lecture impossible, valeurs de repli utilisées.", error);
      return SITE_SETTINGS_FALLBACK;
    }
    return resolveSiteSettings(data);
  } catch (error) {
    console.error("[site_settings] Lecture impossible, valeurs de repli utilisées.", error);
    return SITE_SETTINGS_FALLBACK;
  }
}

/** Réglages chargés par la route racine ; repli si les données ne sont pas disponibles. */
export function useSiteSettings(): SiteSettings {
  const loaded = useRouterState({
    select: (state) => state.matches[0]?.loaderData as SiteSettings | undefined,
  });
  return loaded ?? SITE_SETTINGS_FALLBACK;
}
