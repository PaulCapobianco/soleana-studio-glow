import { ErrorText, Field, LinesField, Section } from "@/components/admin/EventFields";
import { FieldHint } from "@/components/admin/FieldHint";
import { BookingLinkPreview } from "@/components/admin/BookingLinkPreview";
import type { EventErrors, EventFormValues } from "@/lib/events/validation";

type SectionProps = {
  values: EventFormValues;
  errors: EventErrors;
  set: <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => void;
};

/** Formules et réservation de la fiche événement (liste éditable, ordre, suppression). */
export function EventFormulesSection({ values, errors, set }: SectionProps) {
  return (
    <Section
      title="Formules et réservation"
      intro="Chaque formule a son prix, son contenu et son propre lien de réservation (à copier depuis Pelli)."
    >
      {values.formules.map((formule, index) => {
        const patch = (p: Partial<typeof formule>) =>
          set(
            "formules",
            values.formules.map((f, i) => (i === index ? { ...f, ...p } : f)),
          );
        const move = (delta: number) => {
          const next = [...values.formules];
          const target = index + delta;
          if (target < 0 || target >= next.length) return;
          [next[index], next[target]] = [next[target], next[index]];
          set("formules", next);
        };
        return (
          <div key={index} className="space-y-3 border border-border bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field
                label={`Formule ${index + 1} — nom`}
                value={formule.name}
                error={errors[`formules.${index}.name`]}
                onChange={(v) => patch({ name: v })}
              />
              <Field
                label="Prix (€)"
                type="number"
                value={formule.price_eur === null ? "" : String(formule.price_eur)}
                error={errors[`formules.${index}.price_eur`]}
                onChange={(v) => patch({ price_eur: v === "" ? null : Number(v) })}
              />
            </div>
            <LinesField
              label="Contenu de la formule"
              hint="une ligne = une puce ; indiquez ici le nombre de photos incluses"
              value={formule.features}
              placeholder={"25 à 30 minutes de séance\n10 photos numériques HD"}
              onChange={(v) => patch({ features: v })}
            />
            <Field
              label="Lien de réservation"
              type="url"
              value={formule.booking_url}
              error={errors[`formules.${index}.booking_url`]}
              placeholder="https://soleana-studio.pelli.io/booking/…"
              onChange={(v) => patch({ booking_url: v })}
            />
            <BookingLinkPreview url={formule.booking_url} label="Réserver" />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formule.featured}
                  onChange={(e) => patch({ featured: e.target.checked })}
                />
                Mettre en avant
                <FieldHint>affiche « La plus complète »</FieldHint>
              </label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => move(-1)} disabled={index === 0}>
                  ↑ Monter
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  disabled={index === values.formules.length - 1}
                >
                  ↓ Descendre
                </button>
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  onClick={() =>
                    set(
                      "formules",
                      values.formules.filter((_, i) => i !== index),
                    )
                  }
                >
                  Supprimer cette formule
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          set("formules", [
            ...values.formules,
            { name: "", price_eur: null, features: [], booking_url: "", featured: false },
          ])
        }
        className="text-xs uppercase tracking-widest text-primary hover:underline"
      >
        + Ajouter une formule
      </button>
      {values.formules.length === 0 && (
        <>
          <Field
            label="Lien de réservation unique"
            hint="à utiliser s'il n'y a pas de formules"
            type="url"
            value={values.booking_url}
            error={errors.booking_url}
            placeholder="https://soleana-studio.pelli.io/booking/…"
            onChange={(v) => set("booking_url", v)}
          />
          <BookingLinkPreview url={values.booking_url} label="Réserver" />
        </>
      )}
    </Section>
  );
}

/** Questions fréquentes de la fiche événement (liste éditable). */
export function EventFaqSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Questions fréquentes">
      {values.faq.map((item, index) => {
        const patch = (p: Partial<typeof item>) =>
          set(
            "faq",
            values.faq.map((q, i) => (i === index ? { ...q, ...p } : q)),
          );
        const move = (delta: number) => {
          const next = [...values.faq];
          const target = index + delta;
          if (target < 0 || target >= next.length) return;
          [next[index], next[target]] = [next[target], next[index]];
          set("faq", next);
        };
        return (
          <div key={index} className="space-y-2 border border-border bg-background p-4">
            <Field
              label="Question"
              value={item.question}
              onChange={(v) => patch({ question: v })}
            />
            <Field
              label="Réponse"
              textarea
              value={item.answer}
              onChange={(v) => patch({ answer: v })}
            />
            <ErrorText>{errors[`faq.${index}`]}</ErrorText>
            <div className="flex items-center justify-end gap-4 text-xs">
              <button type="button" onClick={() => move(-1)} disabled={index === 0}>
                ↑ Monter
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                disabled={index === values.faq.length - 1}
              >
                ↓ Descendre
              </button>
              <button
                type="button"
                className="text-destructive hover:underline"
                onClick={() =>
                  set(
                    "faq",
                    values.faq.filter((_, i) => i !== index),
                  )
                }
              >
                Supprimer cette question
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => set("faq", [...values.faq, { question: "", answer: "" }])}
        className="text-xs uppercase tracking-widest text-primary hover:underline"
      >
        + Ajouter une question
      </button>
    </Section>
  );
}
