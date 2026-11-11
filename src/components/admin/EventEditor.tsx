import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CharCounter,
  DateListField,
  ErrorText,
  Field,
  LinesField,
  Section,
} from "@/components/admin/EventFields";
import { FieldHint } from "@/components/admin/FieldHint";
import { AppearanceFields } from "@/components/admin/AppearanceFields";
import { DuplicateEventDialog } from "@/components/admin/DuplicateEventDialog";
import { EventGalleriesAdmin } from "@/components/admin/EventGalleriesAdmin";
import { EventPageContent } from "@/components/site/EventPage";
import { eventAssets } from "@/components/site/event-assets";
import { buildAppearance } from "@/lib/events/appearance";
import { buildTeaser } from "@/lib/events/presentation";
import { toastAdminError } from "@/lib/admin/write-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import {
  type GalleryDuplication,
  deleteDraftEvent,
  duplicateEvent,
  formValuesToUpdate,
  previewContent,
  removeCover,
  rowToFormValues,
  saveEvent,
  uploadCover,
} from "@/lib/events/admin";
import { formatHeroDates, isEditionOver } from "@/lib/events/dates";
import type { EventRow, EventStatus } from "@/lib/events/types";
import {
  slugify,
  validateEventDraft,
  validateEventForPublish,
  type EventErrors,
  type EventFormValues,
} from "@/lib/events/validation";

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export function EventEditor({ initial }: { initial: EventRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setDirty = useDirtySet();
  const [row, setRow] = useState(initial);
  const [baseline, setBaseline] = useState(() => rowToFormValues(initial));
  const [values, setValues] = useState(baseline);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPublishErrors, setShowPublishErrors] = useState(false);
  const [preview, setPreview] = useState<null | "open" | "over">(null);
  const [duplicating, setDuplicating] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const status = row.status as EventStatus;
  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  );
  useEffect(() => setDirty(row.id, isDirty), [isDirty, row.id, setDirty]);

  // Un événement déjà publié est contrôlé comme à la publication : on n'enregistre jamais une page
  // visible qu'on ne pourrait plus afficher correctement.
  const errors: EventErrors = useMemo(
    () =>
      status === "published" || showPublishErrors
        ? validateEventForPublish(values)
        : validateEventDraft(values),
    [values, status, showPublishErrors],
  );
  const slugLocked = Boolean(row.first_published_at);
  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function applySaved(saved: EventRow) {
    const next = rowToFormValues(saved);
    setRow(saved);
    setBaseline(next);
    setValues(next);
    qc.setQueryData(["admin-event", saved.id], saved);
    void qc.invalidateQueries({ queryKey: ["admin-events"] });
  }

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (err) {
      void toastAdminError(err);
    } finally {
      setBusy(null);
    }
  }

  function firstError(found: EventErrors): string {
    const message = Object.values(found)[0];
    const count = Object.keys(found).length;
    return count > 1
      ? `${message} (et ${count - 1} autre${count > 2 ? "s" : ""} à corriger)`
      : message;
  }

  const save = () =>
    run("save", async () => {
      if (Object.keys(errors).length > 0) {
        toast.error(firstError(errors));
        return;
      }
      applySaved(await saveEvent(row.id, formValuesToUpdate(values)));
      toast.success(
        status === "published"
          ? "Enregistré : les modifications sont visibles sur le site."
          : "Modifications enregistrées.",
      );
    });

  const publish = () =>
    run("publish", async () => {
      const found = validateEventForPublish(values);
      if (Object.keys(found).length > 0) {
        setShowPublishErrors(true);
        toast.error(`Impossible de publier : ${firstError(found)}`);
        return;
      }
      if (
        !window.confirm(
          "Publier cet événement ? Sa page sera visible par tout le monde dès maintenant" +
            (values.show_teaser ? ", et il apparaîtra sur la page d'accueil." : "."),
        )
      ) {
        return;
      }
      applySaved(await saveEvent(row.id, formValuesToUpdate(values), "published"));
      setShowPublishErrors(false);
      toast.success("Événement publié : il est maintenant visible sur le site.");
    });

  const changeStatus = (next: EventStatus, confirmText: string | null, message: string) =>
    run(`status-${next}`, async () => {
      if (confirmText && !window.confirm(confirmText)) return;
      if (isDirty) {
        const found = validateEventDraft(values);
        if (Object.keys(found).length > 0) {
          toast.error(firstError(found));
          return;
        }
        applySaved(await saveEvent(row.id, formValuesToUpdate(values), next));
      } else {
        applySaved(await saveEvent(row.id, {}, next));
      }
      toast.success(message);
    });

  const askDuplicate = () => {
    if (
      isDirty &&
      !window.confirm("Les modifications non enregistrées ne seront pas copiées. Continuer ?")
    ) {
      return;
    }
    setDuplicating(true);
  };

  const duplicate = (galleries: GalleryDuplication) =>
    run("duplicate", async () => {
      setDuplicating(false);
      const copy = await duplicateEvent(row, galleries);
      await qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Copie créée en brouillon. Choisissez maintenant les nouvelles dates.");
      setDirty(row.id, false);
      await navigate({ to: "/admin/evenements/$id", params: { id: copy.id } });
    });

  const remove = () =>
    run("delete", async () => {
      if (!window.confirm("Supprimer ce brouillon ? Cette action est définitive.")) return;
      await deleteDraftEvent(row);
      setDirty(row.id, false);
      await qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Brouillon supprimé.");
      await navigate({ to: "/admin/evenements" });
    });

  const upload = (file: File) =>
    run("cover", async () => {
      const saved = await uploadCover(row, file);
      setRow(saved);
      qc.setQueryData(["admin-event", saved.id], saved);
      toast.success("Image enregistrée.");
    });

  const dropCover = () =>
    run("cover", async () => {
      if (!window.confirm("Retirer l'image de couverture ?")) return;
      const saved = await removeCover(row);
      setRow(saved);
      qc.setQueryData(["admin-event", saved.id], saved);
      toast.success("Image retirée.");
    });

  const previewEvent = useMemo(() => previewContent(row, values), [row, values]);
  const previewAppearance = useMemo(() => buildAppearance(previewEvent), [previewEvent]);
  const teaserPreview = useMemo(
    () => buildTeaser(previewEvent, previewAppearance),
    [previewEvent, previewAppearance],
  );
  const assets = eventAssets(row.slug);
  const editionOver = isEditionOver(values.event_dates, values.fallback_dates, new Date());

  return (
    <div className="space-y-6" ref={topRef}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl italic text-primary">
            {values.title || "Sans titre"}
          </h1>
          <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest">
            {STATUS_LABEL[status]}
          </span>
          {status === "published" && editionOver && (
            <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Édition terminée
            </span>
          )}
        </div>
        {status === "published" && (
          <p className="border border-primary/30 bg-primary/5 p-3 text-sm">
            Cet événement est <strong>publié</strong> : chaque enregistrement est visible tout de
            suite sur le site.{" "}
            <a href={`/${row.slug}`} target="_blank" rel="noopener" className="underline">
              Voir la page
            </a>
          </p>
        )}
        {status === "archived" && (
          <p className="border border-border bg-background p-3 text-sm">
            Cet événement est <strong>archivé</strong> : il n&apos;est plus visible sur le site.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest">
          <button
            type="button"
            disabled={!isDirty || busy !== null}
            onClick={() => void save()}
            className="bg-primary px-5 py-2 text-primary-foreground hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "save" ? "Enregistrement…" : "Enregistrer"}
          </button>
          {status !== "published" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void publish()}
              className="border border-primary px-5 py-2 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
            >
              {busy === "publish" ? "Publication…" : "Publier"}
            </button>
          )}
          {status === "published" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void changeStatus(
                  "draft",
                  "Dépublier cet événement ? Sa page ne sera plus visible sur le site (ni sur l'accueil) jusqu'à une nouvelle publication.",
                  "Événement dépublié : il n'est plus visible sur le site.",
                )
              }
              className="border border-border px-5 py-2 hover:bg-background disabled:opacity-40"
            >
              Dépublier
            </button>
          )}
          <button
            type="button"
            onClick={() => setPreview(preview ? null : "open")}
            className="border border-border px-5 py-2 hover:bg-background"
          >
            {preview ? "Fermer l'aperçu" : "Aperçu"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={askDuplicate}
            className="px-2 py-2 text-primary hover:underline disabled:opacity-40"
          >
            Dupliquer
          </button>
          {status === "archived" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void changeStatus("draft", null, "Remis en brouillon.")}
              className="px-2 py-2 text-muted-foreground hover:underline disabled:opacity-40"
            >
              Remettre en brouillon
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void changeStatus(
                  "archived",
                  status === "published"
                    ? "Archiver cet événement ? Sa page ne sera plus visible sur le site. Vous pourrez le remettre en brouillon plus tard."
                    : "Archiver cet événement ?",
                  "Événement archivé.",
                )
              }
              className="px-2 py-2 text-muted-foreground hover:underline disabled:opacity-40"
            >
              Archiver
            </button>
          )}
          {status === "draft" && !row.first_published_at && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void remove()}
              className="px-2 py-2 text-destructive hover:underline disabled:opacity-40"
            >
              Supprimer ce brouillon
            </button>
          )}
        </div>
        {isDirty && <p className="text-xs text-orange-700">Modifications non enregistrées.</p>}
      </header>

      {preview && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <strong className="uppercase tracking-widest">
              Aperçu (avec vos modifications, même non enregistrées)
            </strong>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preview === "over"}
                onChange={(e) => setPreview(e.target.checked ? "over" : "open")}
              />
              Voir la page « édition terminée »
            </label>
          </div>
          <div className="max-h-[70vh] overflow-auto border-2 border-dashed border-border bg-background">
            <EventPageContent
              event={previewEvent}
              isOver={preview === "over"}
              appearance={previewAppearance}
            />
          </div>
        </div>
      )}

      <Section title="Informations générales">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Titre"
            value={values.title}
            error={errors.title}
            maxLength={120}
            onChange={(v) => set("title", v)}
          />
          <Field
            label="Adresse de la page"
            hint={
              slugLocked
                ? "figée depuis la première publication"
                : "modifiable tant que la page n'a jamais été publiée"
            }
            value={values.slug}
            error={errors.slug}
            readOnly={slugLocked}
            placeholder="mini-seances-printemps-2027"
            onChange={(v) => set("slug", v.toLowerCase())}
            onBlur={() => !slugLocked && set("slug", slugify(values.slug))}
          />
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          La page sera visible à : <code>soleanastudio.fr/{values.slug || "…"}</code>
        </p>
        <Field
          label="Sous-titre"
          hint="phrase d'accroche sous le titre"
          value={values.subtitle}
          maxLength={300}
          onChange={(v) => set("subtitle", v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Lieu"
            value={values.location}
            maxLength={160}
            placeholder="Plan-d'Aups-Sainte-Baume"
            onChange={(v) => set("location", v)}
          />
          <Field
            label="Petit texte au-dessus du titre"
            hint="ex. Édition Noël 2027"
            value={values.edition_label}
            maxLength={80}
            onChange={(v) => set("edition_label", v)}
          />
        </div>
      </Section>

      <Section
        title="Dates"
        intro="La page passe automatiquement en « édition terminée » le lendemain de la dernière date (dates de report comprises)."
      >
        <DateListField
          label="Dates des séances"
          dates={values.event_dates}
          error={errors.event_dates}
          addLabel="Ajouter une date"
          onChange={(d) => set("event_dates", d)}
        />
        {values.event_dates.length > 0 && !errors.event_dates && (
          <p className="text-xs text-muted-foreground">
            Affiché en haut de la page : <strong>{formatHeroDates(values.event_dates)}</strong>
          </p>
        )}
        <DateListField
          label="Dates de report en cas de mauvais temps"
          hint="facultatif"
          dates={values.fallback_dates}
          error={errors.fallback_dates}
          addLabel="Ajouter une date de report"
          onChange={(d) => set("fallback_dates", d)}
        />
        <Field
          label="Remarque sur les places"
          hint="facultatif, affichée sous les dates"
          value={values.availability_note}
          maxLength={300}
          placeholder="Deux journées seulement : les places sont limitées."
          onChange={(v) => set("availability_note", v)}
        />
      </Section>

      <Section title="Présentation">
        <Field
          label="Texte de présentation"
          hint="séparez les paragraphes par une ligne vide"
          textarea
          rows={8}
          value={values.description}
          error={errors.description}
          maxLength={4000}
          onChange={(v) => set("description", v)}
        />
        <LinesField
          label="Déroulement de la séance"
          hint="une ligne = une étape, facultatif"
          value={values.experience_steps}
          onChange={(v) => set("experience_steps", v)}
        />
        <Field
          label="Titre de fin de page"
          hint="ex. Envie de vivre votre parenthèse de Noël ?"
          value={values.closing_title}
          maxLength={200}
          onChange={(v) => set("closing_title", v)}
        />
      </Section>

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
          <Field
            label="Lien de réservation unique"
            hint="à utiliser s'il n'y a pas de formules"
            type="url"
            value={values.booking_url}
            error={errors.booking_url}
            placeholder="https://soleana-studio.pelli.io/booking/…"
            onChange={(v) => set("booking_url", v)}
          />
        )}
      </Section>

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

      <Section
        title="Image de couverture"
        intro="Grande image en haut de la page, sur l'accueil et lors des partages. Elle est réduite automatiquement."
      >
        {assets && (
          <p className="border border-border bg-background p-3 text-xs text-muted-foreground">
            Les photos de cette édition (bandeau, galerie, décor) sont fournies avec le site : cette
            image ne les remplace pas. Elle sert surtout aux nouveaux événements.
          </p>
        )}
        {(row.cover_image_small_url ?? row.cover_image_url) ? (
          <img
            src={row.cover_image_small_url ?? row.cover_image_url ?? ""}
            alt={values.cover_image_alt || "Image de couverture actuelle"}
            className="max-h-56 border border-border object-cover"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Aucune image pour le moment.</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="cursor-pointer border border-primary px-4 py-2 uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
            {busy === "cover"
              ? "Envoi en cours…"
              : row.cover_image_url
                ? "Remplacer l'image"
                : "Choisir une image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
          {row.cover_image_url && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void dropCover()}
              className="text-destructive hover:underline"
            >
              Retirer l&apos;image
            </button>
          )}
          <span className="text-muted-foreground">JPG, PNG ou WebP — 25 Mo maximum</span>
        </div>
        <Field
          label="Description de l'image"
          hint="lue par les lecteurs d'écran et par Google, ex. « Famille sous les sapins »"
          value={values.cover_image_alt}
          maxLength={300}
          onChange={(v) => set("cover_image_alt", v)}
        />
      </Section>

      <Section
        title="Galeries photos"
        intro="Créez des galeries (par exemple « Famille », « Couples », « Décor »), envoyez-y vos photos et choisissez leur ordre. Vous pouvez aussi afficher les galeries d'une autre édition."
      >
        <EventGalleriesAdmin event={row} onEventChange={setRow} />
      </Section>

      <Section
        title="Page d'accueil"
        intro="Une invitation à découvrir cet événement peut apparaître sur l'accueil. L'accueil n'en montre qu'une : celle de l'événement dont la prochaine date est la plus proche. Elle disparaît toute seule à la fin de l'édition."
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.show_teaser}
            onChange={(e) => set("show_teaser", e.target.checked)}
          />
          Afficher sur la page d&apos;accueil
          <FieldHint>seulement si l&apos;événement est publié</FieldHint>
        </label>
        {values.show_teaser && (
          <>
            <Field
              label="Titre"
              hint="vide = titre de l'événement"
              value={values.teaser_title}
              maxLength={120}
              onChange={(v) => set("teaser_title", v)}
            />
            <Field
              label="Texte"
              textarea
              value={values.teaser_text}
              error={errors.teaser_text}
              maxLength={400}
              onChange={(v) => set("teaser_text", v)}
            />
            <Field
              label="Texte du bouton"
              hint="vide = « Découvrir »"
              value={values.teaser_cta}
              maxLength={60}
              onChange={(v) => set("teaser_cta", v)}
            />
          </>
        )}
        <Field
          label="Ordre d'affichage"
          hint="l'accueil montre l'événement le plus proche dans le temps ; ce numéro ne sert que si deux événements ont la même prochaine date (1 = en premier)"
          type="number"
          value={String(values.display_order)}
          error={errors.display_order}
          onChange={(v) => set("display_order", Number(v))}
        />
      </Section>

      <Section
        title="Apparence"
        intro="Choisissez les couleurs et les icônes de la page de l'événement et de son invitation sur l'accueil. Tous les thèmes sont vérifiés pour rester lisibles."
      >
        <AppearanceFields
          values={values}
          errors={errors}
          set={set}
          teaserPreview={teaserPreview}
          onOpenPagePreview={() => {
            setPreview("open");
            topRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </Section>

      <Section
        title="Après l'événement"
        intro="Message affiché à la place de la page une fois les dates passées."
      >
        <Field
          label="Phrase d'introduction"
          value={values.ended_title}
          maxLength={200}
          onChange={(v) => set("ended_title", v)}
        />
        <Field
          label="Message de remerciement"
          textarea
          value={values.ended_text}
          maxLength={1000}
          onChange={(v) => set("ended_text", v)}
        />
      </Section>

      <Section
        title="Référencement (Google et réseaux sociaux)"
        intro="Facultatif : si vous laissez vide, le site utilise le titre et le sous-titre."
      >
        <div>
          <Field
            label="Titre pour Google"
            value={values.meta_title}
            maxLength={120}
            onChange={(v) => set("meta_title", v)}
          />
          <CharCounter length={values.meta_title.length} ideal={[50, 60]} />
        </div>
        <div>
          <Field
            label="Description pour Google"
            textarea
            value={values.meta_description}
            maxLength={320}
            onChange={(v) => set("meta_description", v)}
          />
          <CharCounter length={values.meta_description.length} ideal={[140, 160]} />
        </div>
        <Field
          label="Titre pour les réseaux sociaux"
          value={values.og_title}
          maxLength={120}
          onChange={(v) => set("og_title", v)}
        />
        <Field
          label="Description pour les réseaux sociaux"
          textarea
          value={values.og_description}
          maxLength={320}
          onChange={(v) => set("og_description", v)}
        />
      </Section>
      {duplicating && (
        <DuplicateEventDialog
          eventTitle={values.title || row.title}
          busy={busy === "duplicate"}
          onCancel={() => setDuplicating(false)}
          onConfirm={(mode) => void duplicate(mode)}
        />
      )}
    </div>
  );
}
