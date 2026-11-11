import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { fetchAllRows } from "@/lib/supabase-pagination";
import { largestVariant } from "@/lib/photos/variants";
import { supabase } from "@/integrations/supabase/client";
import { generateBrowserPhotoVariants, validatePhotoSource } from "@/lib/photos/browser-encoder";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { FieldHint } from "@/components/admin/FieldHint";
import { toastAdminError } from "@/lib/admin/write-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { AdminValidationError } from "@/lib/admin/friendly-error";
import { uploadEventPhoto } from "@/lib/photos/event-upload";
import {
  describeEventUsage,
  eventGalleryChoices,
  planEventUpload,
  type EventPlacementLite,
  type EventTargetOption,
  type UploadTargetKind,
} from "@/lib/photos/upload-target";
import { getPhotoStorageCapacity } from "@/lib/photos/storage-admin.functions";
import {
  PhotoWithCategory,
  SeoPage,
  Placement,
  PhotoVariant,
  GALLERY_SLOTS,
  galleryCategory,
} from "./photos/types";
import { queryError } from "./photos/helpers";
import { PhotoCard } from "./photos/PhotoCard";
import { PhotoStorageCapacityPanel } from "./photos/StorageCapacityPanel";

export function PhotosAdmin() {
  const qc = useQueryClient();
  const setDirty = useDirtySet();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [target, setTarget] = useState<UploadTargetKind>("seo");
  const [eventId, setEventId] = useState("");
  const [seoPageId, setSeoPageId] = useState("");
  const [slot, setSlot] = useState("gallery-1");
  const [order, setOrder] = useState("");
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: photos, isError: photosUnavailable } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*, category:categories(name, slug)")
        .order("display_order");
      queryError(error);
      return (data ?? []) as PhotoWithCategory[];
    },
  });

  const { data: cats, isError: categoriesUnavailable } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order");
      queryError(error);
      return data ?? [];
    },
  });

  const { data: seoPages, isError: seoPagesUnavailable } = useQuery({
    queryKey: ["admin-photo-seo-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_pages")
        .select("id, slug, h1, published")
        .order("slug");
      queryError(error);
      return (data ?? []).filter((page) => GALLERY_SLOTS[page.slug]) as SeoPage[];
    },
  });

  const { data: placements, isError: placementsUnavailable } = useQuery({
    queryKey: ["admin-photo-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_placements")
        .select(
          "id, photo_id, seo_page_id, slot, display_order, object_position_x_pct, object_position_y_pct, published",
        )
        .eq("context_type", "seo");
      queryError(error);
      return (data ?? []) as Placement[];
    },
    retry: false,
  });

  const { data: variants, isError: variantsUnavailable } = useQuery({
    queryKey: ["admin-photo-variants"],
    queryFn: async () => {
      // 8 variantes par photo : au-delà de 1 000 lignes, PostgREST tronque sans erreur.
      return (await fetchAllRows((from, to) =>
        supabase
          .from("photo_variants")
          .select("id, photo_id, storage_path, format, width" as never)
          .order("id")
          .range(from, to),
      )) as unknown as PhotoVariant[];
    },
    retry: false,
  });

  // Galeries d'événement (colonne `galleries`, migration 20261110) et leurs photos. Absentes tant que
  // la migration n'est pas appliquée : la cible « Événement » reste alors masquée.
  const { data: eventOptions } = useQuery({
    queryKey: ["admin-photo-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, slug, title, galleries" as never)
        .order("created_at", { ascending: false });
      queryError(error);
      return (data ?? []) as unknown as EventTargetOption[];
    },
    retry: false,
  });
  const { data: eventPlacements } = useQuery({
    queryKey: ["admin-photo-event-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_placements")
        .select("photo_id, event_id, slot, display_order")
        .eq("context_type", "event");
      queryError(error);
      return (data ?? []) as unknown as (EventPlacementLite & { photo_id: string })[];
    },
    retry: false,
  });
  const eventTargetAvailable = Boolean(eventOptions && eventPlacements);

  const {
    data: storageCapacity,
    isError: storageCapacityUnavailable,
    refetch: refetchStorageCapacity,
  } = useQuery({
    queryKey: ["admin-photo-storage-capacity"],
    queryFn: () => getPhotoStorageCapacity({ data: {} }),
    retry: false,
    refetchInterval: 60_000,
  });

  const storageReady = Boolean(
    placements &&
    variants &&
    seoPages?.length &&
    cats?.length &&
    photos &&
    !placementsUnavailable &&
    !variantsUnavailable &&
    !seoPagesUnavailable &&
    !categoriesUnavailable &&
    !photosUnavailable &&
    storageCapacity &&
    !storageCapacityUnavailable,
  );
  const selectedPage = seoPages?.find((page) => page.id === seoPageId);
  const availableSlots = selectedPage ? GALLERY_SLOTS[selectedPage.slug] : ["gallery-1"];
  const eventGalleries = eventGalleryChoices(eventOptions ?? [], eventId);
  const nextOrder =
    Math.max(
      -1,
      ...(target === "event"
        ? (eventPlacements ?? []).filter(
            (placement) => placement.event_id === eventId && placement.slot === slot,
          )
        : (placements ?? []).filter(
            (placement) => placement.seo_page_id === seoPageId && placement.slot === slot,
          )
      ).map((placement) => placement.display_order),
    ) + 1;

  async function handleEventUpload(form: HTMLFormElement) {
    if (uploading || !storageReady || !file) return;
    const alt = altText.trim();
    if (!alt) return toast.error("Décrivez la photo dans le texte alternatif.");
    setUploading(true);
    try {
      const plan = planEventUpload({
        events: eventOptions ?? [],
        placements: eventPlacements ?? [],
        eventId,
        slot,
        orderInput: order,
      });
      const result = await uploadEventPhoto({
        file,
        alt,
        eventId: plan.eventId,
        eventSlug: plan.eventSlug,
        slot: plan.slot,
        displayOrder: plan.displayOrder,
        published,
      });
      if (result.warning) toast.warning(result.warning);
      toast.success(`Photo ajoutée à « ${plan.galleryTitle} » (${plan.eventTitle}).`);
      setFile(null);
      setAltText("");
      setOrder("");
      form.reset();
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-variants"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-event-placements"] });
      qc.invalidateQueries({ queryKey: ["admin-event-placements", plan.eventId] });
      qc.invalidateQueries({ queryKey: ["admin-photo-storage-capacity"] });
    } catch (error) {
      if (error instanceof AdminValidationError) toast.error(error.message);
      else void toastAdminError(error);
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (target === "event") return handleEventUpload(form);
    if (uploading || !storageReady || !file || !selectedPage) return;
    const alt = altText.trim();
    const categorySlug = galleryCategory(selectedPage.slug);
    const category = cats?.find((item) => item.slug === categorySlug);
    const displayOrder = order.trim() === "" ? nextOrder : Number(order);
    if (!alt) return toast.error("Décrivez la photo dans le texte alternatif.");
    try {
      await validatePhotoSource(file);
    } catch (error) {
      return toast.error(
        error instanceof Error ? error.message : "Choisissez un original JPG/JPEG ou HEIC/HEIF.",
      );
    }
    if (!category || !availableSlots.includes(slot))
      return toast.error("Choisissez une galerie valide.");
    if (
      !Number.isSafeInteger(displayOrder) ||
      displayOrder < 0 ||
      (placements ?? []).some(
        (item) =>
          item.seo_page_id === seoPageId &&
          item.slot === slot &&
          item.display_order === displayOrder,
      )
    ) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (
      ![positionX, positionY].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    ) {
      return toast.error("Le cadrage doit être compris entre 0 et 100 %.");
    }

    setUploading(true);
    const uploadedPaths: string[] = [];
    let photoId: string | undefined;
    try {
      const sourceKey = `galleries/${categorySlug}/${crypto.randomUUID().replaceAll("-", "")}`;
      let generated;
      try {
        generated = await generateBrowserPhotoVariants(file, sourceKey);
      } catch (error) {
        console.error("Préparation locale de la photo impossible", error);
        return toast.error(
          error instanceof Error
            ? error.message
            : "Cet appareil ne peut pas préparer cette image. Essayez un JPG.",
        );
      }
      const additionalBytes = generated.reduce((sum, variant) => sum + variant.byte_size, 0);
      const capacity = await getPhotoStorageCapacity({ data: { additionalBytes } });
      if (!capacity.canUpload) {
        return toast.error(
          "L’espace photo configuré serait dépassé. Supprimez d’anciennes photos, nettoyez les variantes inutilisées/orphelines ou augmentez la capacité du projet.",
        );
      }
      if (capacity.projectedPercent !== null && capacity.projectedPercent >= 85) {
        toast.warning(
          `Après cet envoi, le stockage photo atteindrait ${capacity.projectedPercent.toFixed(1)} % de sa limite configurée.`,
        );
      }
      for (const variant of generated) {
        const { error } = await supabase.storage
          .from("photos")
          .upload(variant.storage_path, variant.blob, {
            contentType: `image/${variant.format}`,
            cacheControl: "31536000",
            upsert: false,
          });
        queryError(error);
        uploadedPaths.push(variant.storage_path);
      }
      const webp = largestVariant(generated, "webp");
      if (!webp) throw new Error("Variante WebP absente.");
      const imageUrl = supabase.storage.from("photos").getPublicUrl(webp.storage_path)
        .data.publicUrl;
      const { data: newPhoto, error: photoError } = await supabase
        .from("photos")
        .insert({
          image_url: imageUrl,
          alt_text: alt,
          category_id: category.id,
          published: true,
          on_home: false,
          on_portfolio: false,
          source_key: sourceKey,
        })
        .select("id")
        .single();
      queryError(photoError);
      if (!newPhoto) throw new Error("La photo n'a pas été créée.");
      const id = newPhoto.id;
      photoId = id;
      const { error: variantsError } = await supabase.from("photo_variants").insert(
        generated.map((variant) => ({
          photo_id: id,
          storage_path: variant.storage_path,
          format: variant.format,
          width: variant.width,
          height: variant.height,
          byte_size: variant.byte_size,
          sha256: variant.sha256,
        })) as never,
      );
      queryError(variantsError);
      const { error: placementError } = await supabase.from("photo_placements").insert({
        placement_key: `seo/${selectedPage.slug}/${slot}/${crypto.randomUUID().replaceAll("-", "")}`,
        photo_id: photoId,
        context_type: "seo",
        seo_page_id: seoPageId,
        slot,
        display_order: displayOrder,
        object_position_x_pct: positionX,
        object_position_y_pct: positionY,
        published,
      });
      queryError(placementError);
      toast.success("Photo et variantes ajoutées à la galerie");
      setFile(null);
      setAltText("");
      setOrder("");
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-variants"] });
      form.reset();
    } catch (error) {
      // L'envoi n'est pas une transaction SQL : supprimer tout ce qui a été créé par cet essai.
      const cleanupErrors: unknown[] = [];
      if (photoId) {
        for (const operation of [
          supabase.from("photo_placements").delete().eq("photo_id", photoId),
          supabase.from("photo_variants").delete().eq("photo_id", photoId),
          supabase.from("photos").delete().eq("id", photoId),
        ]) {
          try {
            const result = await operation;
            if (result.error) cleanupErrors.push(result.error);
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
      }
      if (uploadedPaths.length) {
        try {
          const result = await supabase.storage.from("photos").remove(uploadedPaths);
          if (result.error) cleanupErrors.push(result.error);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length)
        console.error("Nettoyage incomplet après échec d'envoi", {
          cleanupErrors,
          uploadedPaths,
          photoId,
        });
      if (cleanupErrors.length)
        toast.error(
          "Envoi interrompu ; le nettoyage est incomplet. Demandez une vérification du stockage.",
        );
      else void toastAdminError(error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <h1 className="font-display text-4xl italic text-primary">Photos</h1>
      </header>

      <CategoriesAdmin />

      <PhotoStorageCapacityPanel
        capacity={storageCapacity}
        unavailable={storageCapacityUnavailable}
        onRefresh={() => void refetchStorageCapacity()}
      />

      <form
        onSubmit={handleUpload}
        className="space-y-4 border border-border bg-surface p-4 sm:p-6"
      >
        <h2 className="font-display text-2xl italic text-primary">Ajouter une photo</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez un original JPG/JPEG, HEIC/HEIF ou PNG. Les huit variantes web sont créées sur
          cet appareil ; le fichier source n'est jamais envoyé.
        </p>
        {!storageReady && (
          <p role="status" className="text-sm text-muted-foreground">
            L'ajout sera disponible après l'application des migrations Photos et le chargement des
            galeries.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            Photo depuis l'appareil
            <FieldHint>
              JPG/JPEG, HEIC/HEIF ou PNG ; 25 Mo maximum. La prise en charge HEIC dépend du
              navigateur et de l'iPhone.
            </FieldHint>
            <input
              type="file"
              accept="image/jpeg,.jpg,.jpeg,image/heic,image/heif,.heic,.heif,image/png,.png"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
          </label>
          <label className="space-y-1 text-sm">
            Texte alternatif obligatoire
            <FieldHint>
              Décrivez ce que montre l'image, sans nommer la cliente si elle ne le souhaite pas.
            </FieldHint>
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              required
              maxLength={300}
              className="min-h-11 w-full border border-border bg-background px-3 py-2"
            />
          </label>
          {eventTargetAvailable && (
            <label className="space-y-1 text-sm">
              Destination
              <FieldHint>une page du site, ou la galerie d'un événement</FieldHint>
              <select
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value as UploadTargetKind);
                  setSlot(event.target.value === "event" ? "" : "gallery-1");
                  setOrder("");
                }}
                className="min-h-11 w-full border border-border bg-background px-3 py-2"
              >
                <option value="seo">Page du site</option>
                <option value="event">Événement</option>
              </select>
            </label>
          )}
          {target === "event" ? (
            <>
              <label className="space-y-1 text-sm">
                Événement
                <FieldHint>l'événement dont la page affichera la photo</FieldHint>
                <select
                  value={eventId}
                  onChange={(event) => {
                    setEventId(event.target.value);
                    setSlot("");
                    setOrder("");
                  }}
                  required
                  className="min-h-11 w-full border border-border bg-background px-3 py-2"
                >
                  <option value="">Choisir un événement</option>
                  {(eventOptions ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Galerie de l'événement
                <FieldHint>
                  {eventId && eventGalleries.length === 0
                    ? "cet événement n'a pas encore de galerie : créez-la dans la fiche de l'événement"
                    : "les galeries se créent et se renomment dans la fiche de l'événement"}
                </FieldHint>
                <select
                  value={slot}
                  onChange={(event) => {
                    setSlot(event.target.value);
                    setOrder("");
                  }}
                  required
                  className="min-h-11 w-full border border-border bg-background px-3 py-2"
                >
                  <option value="">Choisir une galerie</option>
                  {eventGalleries.map((gallery) => (
                    <option key={gallery.slot} value={gallery.slot}>
                      {gallery.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="space-y-1 text-sm">
                Page galerie
                <FieldHint>page SEO sur laquelle la photo apparaîtra</FieldHint>
                <select
                  value={seoPageId}
                  onChange={(event) => {
                    setSeoPageId(event.target.value);
                    setSlot("gallery-1");
                    setOrder("");
                  }}
                  required
                  className="min-h-11 w-full border border-border bg-background px-3 py-2"
                >
                  <option value="">Choisir une page</option>
                  {(seoPages ?? []).map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.h1}
                      {page.published ? "" : " (non publiée)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Galerie dans la page
                <FieldHint>certaines pages ont plusieurs galeries</FieldHint>
                <select
                  value={slot}
                  onChange={(event) => {
                    setSlot(event.target.value);
                    setOrder("");
                  }}
                  className="min-h-11 w-full border border-border bg-background px-3 py-2"
                >
                  {availableSlots.map((value) => (
                    <option key={value} value={value}>
                      Galerie {value.split("-")[1]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="space-y-1 text-sm">
            Ordre d'affichage
            <FieldHint>numéro libre dans cette galerie ; prochain numéro : {nextOrder}</FieldHint>
            <input
              type="number"
              min="0"
              step="1"
              value={order}
              placeholder={String(nextOrder)}
              onChange={(event) => setOrder(event.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">
              Cadrage horizontal (%)
              <input
                type="number"
                min="0"
                max="100"
                value={positionX}
                onChange={(event) => setPositionX(Number(event.target.value))}
                className="min-h-11 w-full border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              Cadrage vertical (%)
              <input
                type="number"
                min="0"
                max="100"
                value={positionY}
                onChange={(event) => setPositionY(Number(event.target.value))}
                className="min-h-11 w-full border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          Publier cet emplacement
          <FieldHint>visible dans la galerie après activation de Storage</FieldHint>
        </label>
        <button
          type="submit"
          disabled={!storageReady || uploading}
          className="min-h-11 bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Préparation et envoi…" : "Ajouter à la galerie"}
        </button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(photos ?? []).map((p) => (
          <PhotoCard
            key={p.id}
            item={p}
            categories={cats ?? []}
            seoPages={seoPages ?? []}
            placements={(placements ?? []).filter((placement) => placement.photo_id === p.id)}
            variants={(variants ?? []).filter((variant) => variant.photo_id === p.id)}
            storageReady={storageReady}
            eventUsage={describeEventUsage(
              eventOptions ?? [],
              (eventPlacements ?? []).filter((placement) => placement.photo_id === p.id),
            )}
            allPlacements={placements ?? []}
            onPlacementDirtyChange={(id, dirty) => setDirty(`placement:${id}`, dirty)}
            onDirtyChange={(dirty) => setDirty(p.id, dirty)}
          />
        ))}
      </div>
      {photosUnavailable && (
        <p role="alert" className="text-sm text-destructive">
          La liste des photos ne peut pas être chargée.
        </p>
      )}
      {photos && photos.length === 0 && (
        <p className="text-sm text-muted-foreground p-12 text-center bg-surface border border-border">
          Aucune photo. Cliquez sur « Ajouter une photo » pour commencer.
        </p>
      )}
    </div>
  );
}
