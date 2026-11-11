import { useId, useState } from "react";
import { EventIcon } from "@/components/site/EventIcon";
import { EventTeaser } from "@/components/site/EventTeaser";
import { ErrorText } from "@/components/admin/EventFields";
import { FieldHint } from "@/components/admin/FieldHint";
import { ICON_NODES } from "@/lib/events/icon-data";
import { ICON_LABELS } from "@/lib/events/icon-labels";
import {
  BULLET_ICON_IDS,
  DEFAULT_BULLET_ICON,
  DEFAULT_MAIN_ICON,
  MAIN_ICON_IDS,
} from "@/lib/events/icons";
import type { EventTeaserData } from "@/lib/events/types";
import { THEMES, checkAccent, getTheme, isHexColor } from "@/lib/events/theme";
import type { EventErrors, EventFormValues } from "@/lib/events/validation";

const LABEL = "font-mono text-[10px] uppercase tracking-widest text-muted-foreground";

type Props = {
  values: EventFormValues;
  errors: EventErrors;
  set: <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => void;
  teaserPreview: EventTeaserData;
  onOpenPagePreview: () => void;
};

export function AppearanceFields({ values, errors, set, teaserPreview, onOpenPagePreview }: Props) {
  const theme = getTheme(values.theme);
  const accent = values.accent_color.trim();
  // État propre à la case : vider le champ de code ne doit pas refermer le panneau.
  const [customOn, setCustomOn] = useState(accent !== "");
  const accentCheck = isHexColor(accent) ? checkAccent(values.theme, accent) : null;
  const colorId = useId();

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={LABEL}>
          Thème
          <FieldHint>les couleurs de toute la page, vérifiées pour rester lisibles</FieldHint>
        </legend>
        <div
          role="radiogroup"
          aria-label="Thème"
          className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {THEMES.map((t) => {
            const selected = t.id === values.theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("theme", t.id)}
                className={`overflow-hidden border text-left transition ${selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-foreground/40"}`}
              >
                <span
                  className="block px-3 py-3"
                  style={{ background: t.primary, color: "#fffdf8" }}
                  aria-hidden="true"
                >
                  <span className="block font-display text-lg italic leading-tight">
                    Aa Mini-séances
                  </span>
                  <span className="mt-1 block text-[11px]" style={{ color: t.accentText }}>
                    Édition · Soleana Studio
                  </span>
                  <span className="mt-2 block h-1 w-10" style={{ background: t.accent }} />
                </span>
                <span className="block bg-background px-3 py-2 text-xs">
                  <strong>{t.label}</strong>
                  {selected && <span className="ml-1 text-primary">✓ choisi</span>}
                  <span className="block text-muted-foreground">{t.mood}</span>
                </span>
              </button>
            );
          })}
        </div>
        <ErrorText>{errors.theme}</ErrorText>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customOn}
            onChange={(e) => {
              setCustomOn(e.target.checked);
              set("accent_color", e.target.checked ? theme.accent : "");
            }}
          />
          Personnaliser la couleur d&apos;accent
          <FieldHint>facultatif : la petite couleur des filets et des décors</FieldHint>
        </label>
        {customOn && (
          <div className="space-y-2 border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                id={colorId}
                type="color"
                aria-label="Choisir la couleur d'accent"
                value={isHexColor(accent) ? accent : theme.accent}
                onChange={(e) => set("accent_color", e.target.value.toUpperCase())}
                className="h-10 w-14 cursor-pointer border border-border bg-background"
              />
              <input
                type="text"
                aria-label="Code de la couleur d'accent"
                value={values.accent_color}
                maxLength={7}
                placeholder="#C6966F"
                onChange={(e) => set("accent_color", e.target.value.trim())}
                className="w-28 border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <span className="text-xs text-muted-foreground">
                Thème d&apos;origine : <span style={{ color: theme.accent }}>■</span> {theme.accent}
              </span>
            </div>
            {accentCheck?.ok && (
              <p className="text-xs text-green-800">
                ✓ Cette couleur est bien lisible avec ce thème.
              </p>
            )}
            {accentCheck && !accentCheck.ok && (
              <div role="alert" className="space-y-1 text-xs text-destructive">
                <p>{accentCheck.message}</p>
                {accentCheck.suggestion && (
                  <button
                    type="button"
                    onClick={() => set("accent_color", accentCheck.suggestion!)}
                    className="underline"
                  >
                    Utiliser une nuance lisible ({accentCheck.suggestion}){" "}
                    <span style={{ color: accentCheck.suggestion }}>■</span>
                  </button>
                )}
              </div>
            )}
            <ErrorText>{isHexColor(accent) ? undefined : errors.accent_color}</ErrorText>
          </div>
        )}
      </div>

      <IconPicker
        legend="Icône principale"
        hint="remplace l'étoile au-dessus des titres et sur l'accueil"
        ids={MAIN_ICON_IDS}
        value={values.icon_main}
        defaultId={DEFAULT_MAIN_ICON}
        onChange={(id) => set("icon_main", id)}
        error={errors.icon_main}
      />
      <IconPicker
        legend="Icône des listes"
        hint="devant chaque ligne du contenu des formules"
        ids={BULLET_ICON_IDS}
        value={values.icon_bullet}
        defaultId={DEFAULT_BULLET_ICON}
        onChange={(id) => set("icon_bullet", id)}
        error={errors.icon_bullet}
      />

      <div className="space-y-2">
        <p className={LABEL}>
          Aperçu sur la page d&apos;accueil
          <FieldHint>se met à jour à chaque choix</FieldHint>
        </p>
        {!values.show_teaser && (
          <p className="text-xs text-muted-foreground">
            Cet événement n&apos;apparaît pas sur l&apos;accueil pour l&apos;instant (case «
            Afficher sur la page d&apos;accueil » ci-dessous) : voici à quoi il ressemblerait.
          </p>
        )}
        <div
          className="pointer-events-none max-h-[26rem] overflow-hidden border-2 border-dashed border-border bg-background"
          aria-hidden="true"
        >
          <EventTeaser teaser={teaserPreview} />
        </div>
        <button
          type="button"
          onClick={onOpenPagePreview}
          className="text-xs uppercase tracking-widest text-primary hover:underline"
        >
          Voir l&apos;aperçu de la page complète
        </button>
      </div>
    </div>
  );
}

function IconPicker({
  legend,
  hint,
  ids,
  value,
  defaultId,
  onChange,
  error,
}: {
  legend: string;
  hint: string;
  ids: readonly string[];
  value: string;
  defaultId: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={LABEL}>
        {legend}
        <FieldHint>{hint}</FieldHint>
      </legend>
      <div
        role="radiogroup"
        aria-label={legend}
        className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8"
      >
        {ids.map((id) => {
          const selected = id === value;
          const node =
            id === DEFAULT_BULLET_ICON || id === DEFAULT_MAIN_ICON ? null : ICON_NODES[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={ICON_LABELS[id]}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 border px-1 py-2 text-[11px] leading-tight ${selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-foreground/40"}`}
            >
              {id === DEFAULT_BULLET_ICON ? (
                <span
                  className="flex h-6 w-6 items-center justify-center text-lg"
                  aria-hidden="true"
                >
                  —
                </span>
              ) : (
                <EventIcon node={node ?? null} className="h-6 w-6 text-primary" />
              )}
              <span aria-hidden="true">{ICON_LABELS[id]}</span>
              {id === defaultId && <span className="sr-only"> (par défaut)</span>}
            </button>
          );
        })}
      </div>
      <ErrorText>{error}</ErrorText>
    </fieldset>
  );
}
