import { useEffect, useId, useState, type ReactNode } from "react";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { formatLongDate, isIsoDate } from "@/lib/events/dates";
import { splitLines } from "@/lib/events/admin";

const LABEL = "font-mono text-[10px] uppercase tracking-widest text-muted-foreground";
const INPUT = "mt-1 w-full bg-background border border-border px-3 py-2 text-sm";

export function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-2xl italic text-primary">{title}</h2>
        {intro && <p className="mt-1 text-xs text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

export function ErrorText({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  value,
  onChange,
  error,
  type = "text",
  textarea,
  rows = 3,
  placeholder,
  maxLength,
  readOnly,
  onBlur,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  onBlur?: () => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const common = {
    id,
    value,
    placeholder,
    maxLength,
    readOnly,
    onBlur,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    className: `${INPUT} ${readOnly ? "opacity-70" : ""} ${error ? "border-destructive" : ""}`,
  };
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
        {hint && <FieldHint>{hint}</FieldHint>}
      </label>
      {textarea ? (
        <textarea rows={rows} onChange={(e) => onChange(e.target.value)} {...common} />
      ) : (
        <input type={type} onChange={(e) => onChange(e.target.value)} {...common} />
      )}
      <ErrorText id={errorId}>{error}</ErrorText>
    </div>
  );
}

/** Un élément par ligne ; les lignes vides sont ignorées. */
export function LinesField({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
  error,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
  placeholder?: string;
  error?: string;
}) {
  // Le texte brut est gardé ici (sinon une ligne vide en cours de frappe disparaîtrait) et resynchronisé
  // si la liste change de l'extérieur (enregistrement, annulation, déplacement d'une carte).
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => {
    if (splitLines(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Field
      label={label}
      hint={hint}
      value={text}
      textarea
      rows={rows}
      placeholder={placeholder}
      error={error}
      onChange={(next) => {
        setText(next);
        onChange(splitLines(next));
      }}
    />
  );
}

export function DateListField({
  label,
  hint,
  dates,
  onChange,
  error,
  addLabel,
}: {
  label: string;
  hint?: string;
  dates: string[];
  onChange: (dates: string[]) => void;
  error?: string;
  addLabel: string;
}) {
  return (
    <div>
      <p className={LABEL}>
        {label}
        {hint && <FieldHint>{hint}</FieldHint>}
      </p>
      <ul className="mt-1 space-y-2">
        {dates.map((date, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              aria-label={`${label} ${index + 1}`}
              onChange={(e) => onChange(dates.map((d, i) => (i === index ? e.target.value : d)))}
              className="border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {isIsoDate(date) ? formatLongDate(date) : "Choisissez une date"}
            </span>
            <button
              type="button"
              onClick={() => onChange(dates.filter((_, i) => i !== index))}
              className="text-xs text-destructive hover:underline"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...dates, ""])}
        className="mt-2 text-xs uppercase tracking-widest text-primary hover:underline"
      >
        + {addLabel}
      </button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function CharCounter({ length, ideal }: { length: number; ideal: [number, number] }) {
  const ok = length >= ideal[0] && length <= ideal[1];
  return (
    <p className={`mt-1 text-[11px] ${ok ? "text-muted-foreground" : "text-orange-700"}`}>
      {length} caractères (idéal : {ideal[0]} à {ideal[1]})
    </p>
  );
}
