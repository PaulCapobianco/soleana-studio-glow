import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(max).optional());

const optionalPhone = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .max(30)
    .regex(/^[0-9+().\s-]+$/, "Téléphone invalide")
    .optional(),
);

export const contactSessionTypes = [
  "Maternité",
  "Famille",
  "Couple",
  "Portrait",
  "Baptême",
  "Mariage",
  "Anniversaire",
  "Autre projet",
] as const;

export const contactFormSchema = z.object({
  first_name: z.string().trim().min(1, "Prénom requis").max(80, "Prénom trop long"),
  last_name: z.string().trim().min(1, "Nom requis").max(80, "Nom trop long"),
  email: z.string().trim().email("Email invalide").max(150, "Email trop long"),
  phone: optionalPhone,
  session_type: z.enum(contactSessionTypes, {
    required_error: "Type de séance requis",
    invalid_type_error: "Type de séance requis",
  }),
  desired_date: optionalText(120),
  location: optionalText(150),
  message: z.string().trim().min(10, "Quelques mots de plus ?").max(2000, "Message trop long"),
  consent: z.boolean().refine((value) => value, {
    message: "Vous devez accepter l'utilisation de vos informations pour être recontacté(e).",
  }),
  turnstile_token: z.string().trim().min(1, "Veuillez valider la vérification anti-spam."),
  website: z.string().max(100).optional().default(""),
  submitted_at: z.string().trim().min(1, "Horodatage requis").max(20, "Horodatage invalide"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
