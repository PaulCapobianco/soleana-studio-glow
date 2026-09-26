import { isGoogleReviewUrl } from "@/lib/google-review-url";

export type SiteSettingsFormValues = {
  email: string;
  phone: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  google_review_url: string | null;
  service_area: string;
  footer_text: string;
};

export type SiteSettingsErrors = Partial<Record<keyof SiteSettingsFormValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Doit commencer par 0 (format national) ou par + (format international).
const PHONE = /^(?:\+[0-9]|0)[0-9 .()-]{5,24}$/;

function httpsUrl(value: string, hosts: string[]): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(host);
  } catch {
    return false;
  }
}

/** Champs facultatifs : une chaîne vide est acceptée (elle sera enregistrée à NULL). */
export function validateSiteSettings(values: SiteSettingsFormValues): SiteSettingsErrors {
  const errors: SiteSettingsErrors = {};
  const email = values.email.trim();
  if (!email) errors.email = "L'adresse e-mail est obligatoire.";
  else if (!EMAIL.test(email)) errors.email = "Adresse e-mail invalide.";

  const phone = values.phone?.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (!phone.startsWith("0") && !phone.startsWith("+")) {
      errors.phone =
        "Le numéro doit commencer par 0 ou par + (ex. 06.67.53.63.12 ou +33 6 67 53 63 12).";
    } else if (!PHONE.test(phone) || digits.length < 9 || digits.length > 15) {
      errors.phone =
        "Numéro invalide : 9 à 15 chiffres, avec seulement des espaces, points, tirets ou parenthèses.";
    }
  }

  const instagram = values.instagram_url?.trim();
  if (instagram && !httpsUrl(instagram, ["instagram.com"])) {
    errors.instagram_url = "Utilisez un lien HTTPS instagram.com.";
  }
  const tiktok = values.tiktok_url?.trim();
  if (tiktok && !httpsUrl(tiktok, ["tiktok.com"])) {
    errors.tiktok_url = "Utilisez un lien HTTPS tiktok.com.";
  }
  const whatsapp = values.whatsapp_url?.trim();
  if (whatsapp && !httpsUrl(whatsapp, ["wa.me", "wa.link", "api.whatsapp.com"])) {
    errors.whatsapp_url = "Utilisez un lien HTTPS WhatsApp (ex. https://wa.me/33612345678).";
  }
  const google = values.google_review_url?.trim();
  if (google && !isGoogleReviewUrl(google)) {
    errors.google_review_url = "Utilisez un lien Google HTTPS valide.";
  }

  const area = values.service_area.trim();
  if (!area) errors.service_area = "La zone d'intervention est obligatoire.";
  else if (area.length > 200) errors.service_area = "200 caractères maximum.";
  const footer = values.footer_text.trim();
  if (!footer) errors.footer_text = "La phrase du pied de page est obligatoire.";
  else if (footer.length > 300) errors.footer_text = "300 caractères maximum.";

  return errors;
}
