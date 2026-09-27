import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { generateBrowserPhotoVariants, validatePhotoSource } from "@/lib/photo-storage";
import { SaveButton } from "@/components/site/admin/SaveButton";
import { FieldHint } from "@/components/site/admin/FieldHint";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import { friendlySupabaseError } from "@/lib/admin/friendly-error";
import { useDirtySet } from "@/lib/admin/use-dirty-set";
import { useEditableRecord } from "@/lib/admin/use-editable-record";
import {
  cleanupOrphanPhotoVariants,
  getPhotoStorageCapacity,
  retryPhotoStorageCleanup,
} from "@/lib/photos/storage-admin.functions";

type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type PhotoWithCategory = PhotoRow & {
  source_key?: string | null;
  category: Pick<CategoryRow, "name" | "slug"> | null;
};
type SeoPage = { id: string; slug: string; h1: string; published: boolean };
type Placement = {
  id: string;
  photo_id: string;
  seo_page_id: string;
  slot: string;
  display_order: number;
  object_position_x_pct: number;
  object_position_y_pct: number;
  published: boolean;
};
type PhotoVariant = { id: string; photo_id: string; storage_path: string; format: string; width: number };

const GALLERY_SLOTS: Record<string, string[]> = {
  "photographe-couple-marseille": ["gallery-1", "gallery-2", "gallery-3"],
  "photographe-famille-marseille": ["gallery-1", "gallery-2"],
  "photographe-grossesse-marseille": ["gallery-1", "gallery-2"],
  "photographe-portrait-marseille": ["gallery-1"],
};

const galleryCategory = (slug: string) => slug.match(/^photographe-(couple|famille|grossesse|portrait)-marseille$/)?.[1];

function queryError(error: unknown) {
  if (error) throw error;
}

function legacyStoragePath(imageUrl: string): string | null {
  try {
    const probe = new URL(supabase.storage.from("photos").getPublicUrl("_probe_").data.publicUrl);
    const image = new URL(imageUrl);
    const prefix = probe.pathname.slice(0, -"_probe_".length);
    if (image.origin !== probe.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

function formatStorageBytes(value: number | null) {
  if (value === null) return "Indisponible";
  if (value < 1_000_000) return `${(value / 1_000).toFixed(0)} kB`;
  return `${(value / 1_000_000).toFixed(2)} MB`;
}

export const Route = createFileRoute("/admin/_authed/photos")({
  head: () => ({
    meta: [{ title: "Photos — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PhotosAdmin,
});

export function PhotosAdmin() {
  const qc = useQueryClient();
  const setDirty = useDirtySet();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
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
      const { data, error } = await supabase.from("seo_pages").select("id, slug, h1, published").order("slug");
      queryError(error);
      return (data ?? []).filter((page) => GALLERY_SLOTS[page.slug]) as SeoPage[];
    },
  });

  const { data: placements, isError: placementsUnavailable } = useQuery({
    queryKey: ["admin-photo-placements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photo_placements")
        .select("id, photo_id, seo_page_id, slot, display_order, object_position_x_pct, object_position_y_pct, published")
        .eq("context_type", "seo");
      queryError(error);
      return (data ?? []) as Placement[];
    },
    retry: false,
  });

  const { data: variants, isError: variantsUnavailable } = useQuery({
    queryKey: ["admin-photo-variants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photo_variants")
        .select("id, photo_id, storage_path, format, width" as never);
      queryError(error);
      return (data ?? []) as unknown as PhotoVariant[];
    },
    retry: false,
  });

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

  const storageReady = Boolean(placements && variants && seoPages?.length && cats?.length && photos &&
    !placementsUnavailable && !variantsUnavailable && !seoPagesUnavailable && !categoriesUnavailable &&
    !photosUnavailable && storageCapacity && !storageCapacityUnavailable);
  const selectedPage = seoPages?.find((page) => page.id === seoPageId);
  const availableSlots = selectedPage ? GALLERY_SLOTS[selectedPage.slug] : ["gallery-1"];
  const nextOrder = Math.max(-1, ...(placements ?? [])
    .filter((placement) => placement.seo_page_id === seoPageId && placement.slot === slot)
    .map((placement) => placement.display_order)) + 1;

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (uploading || !storageReady || !file || !selectedPage) return;
    const alt = altText.trim();
    const categorySlug = galleryCategory(selectedPage.slug);
    const category = cats?.find((item) => item.slug === categorySlug);
    const displayOrder = order.trim() === "" ? nextOrder : Number(order);
    if (!alt) return toast.error("Décrivez la photo dans le texte alternatif.");
    try {
      await validatePhotoSource(file);
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Choisissez un original JPG/JPEG ou HEIC/HEIF.");
    }
    if (!category || !availableSlots.includes(slot)) return toast.error("Choisissez une galerie valide.");
    if (!Number.isSafeInteger(displayOrder) || displayOrder < 0 ||
        (placements ?? []).some((item) => item.seo_page_id === seoPageId && item.slot === slot && item.display_order === displayOrder)) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (![positionX, positionY].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
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
        return toast.error(error instanceof Error ? error.message : "Cet appareil ne peut pas préparer cette image. Essayez un JPG.");
      }
      const additionalBytes = generated.reduce((sum, variant) => sum + variant.byte_size, 0);
      const capacity = await getPhotoStorageCapacity({ data: { additionalBytes } });
      if (!capacity.canUpload) {
        return toast.error("L’espace photo configuré serait dépassé. Supprimez d’anciennes photos, nettoyez les variantes inutilisées/orphelines ou augmentez la capacité du projet.");
      }
      if (capacity.projectedPercent !== null && capacity.projectedPercent >= 85) {
        toast.warning(`Après cet envoi, le stockage photo atteindrait ${capacity.projectedPercent.toFixed(1)} % de sa limite configurée.`);
      }
      for (const variant of generated) {
        const { error } = await supabase.storage.from("photos").upload(variant.storage_path, variant.blob, {
          contentType: `image/${variant.format}`,
          cacheControl: "31536000",
          upsert: false,
        });
        queryError(error);
        uploadedPaths.push(variant.storage_path);
      }
      const webp = generated.filter((variant) => variant.format === "webp").at(-1);
      if (!webp) throw new Error("Variante WebP absente.");
      const imageUrl = supabase.storage.from("photos").getPublicUrl(webp.storage_path).data.publicUrl;
      const { data: newPhoto, error: photoError } = await supabase.from("photos").insert({
        image_url: imageUrl,
        alt_text: alt,
        category_id: category.id,
        published: true,
        on_home: false,
        on_portfolio: false,
        source_key: sourceKey,
      }).select("id").single();
      queryError(photoError);
      if (!newPhoto) throw new Error("La photo n'a pas été créée.");
      const id = newPhoto.id;
      photoId = id;
      const { error: variantsError } = await supabase.from("photo_variants").insert(generated.map((variant) => ({
        photo_id: id,
        storage_path: variant.storage_path,
        format: variant.format,
        width: variant.width,
        height: variant.height,
        byte_size: variant.byte_size,
        sha256: variant.sha256,
      })) as never);
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
      if (cleanupErrors.length) console.error("Nettoyage incomplet après échec d'envoi", { cleanupErrors, uploadedPaths, photoId });
      toast.error(cleanupErrors.length
        ? "Envoi interrompu ; le nettoyage est incomplet. Demandez une vérification du stockage."
        : friendlySupabaseError(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <h1 className="font-display text-4xl italic text-primary">Photos</h1>
      </header>

      <PhotoStorageCapacityPanel
        capacity={storageCapacity}
        unavailable={storageCapacityUnavailable}
        onRefresh={() => void refetchStorageCapacity()}
      />

      <form onSubmit={handleUpload} className="space-y-4 border border-border bg-surface p-4 sm:p-6">
        <h2 className="font-display text-2xl italic text-primary">Ajouter une photo</h2>
        <p className="text-sm text-muted-foreground">Choisissez un original JPG/JPEG, HEIC/HEIF ou PNG. Les six variantes web sont créées sur cet appareil ; le fichier source n'est jamais envoyé.</p>
        {!storageReady && (
          <p role="status" className="text-sm text-muted-foreground">L'ajout sera disponible après l'application des migrations Photos et le chargement des galeries.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">Photo depuis l'appareil
            <FieldHint>JPG/JPEG, HEIC/HEIF ou PNG ; 25 Mo maximum. La prise en charge HEIC dépend du navigateur et de l'iPhone.</FieldHint>
            <input type="file" accept="image/jpeg,.jpg,.jpeg,image/heic,image/heif,.heic,.heif,image/png,.png" required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" />
          </label>
          <label className="space-y-1 text-sm">Texte alternatif obligatoire
            <FieldHint>Décrivez ce que montre l'image, sans nommer la cliente si elle ne le souhaite pas.</FieldHint>
            <input value={altText} onChange={(event) => setAltText(event.target.value)} required maxLength={300}
              className="min-h-11 w-full border border-border bg-background px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">Page galerie
            <FieldHint>page SEO sur laquelle la photo apparaîtra</FieldHint>
            <select value={seoPageId} onChange={(event) => { setSeoPageId(event.target.value); setSlot("gallery-1"); setOrder(""); }} required
              className="min-h-11 w-full border border-border bg-background px-3 py-2">
              <option value="">Choisir une page</option>
              {(seoPages ?? []).map((page) => <option key={page.id} value={page.id}>{page.h1}{page.published ? "" : " (non publiée)"}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Galerie dans la page
            <FieldHint>certaines pages ont plusieurs galeries</FieldHint>
            <select value={slot} onChange={(event) => { setSlot(event.target.value); setOrder(""); }}
              className="min-h-11 w-full border border-border bg-background px-3 py-2">
              {availableSlots.map((value) => <option key={value} value={value}>Galerie {value.split("-")[1]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Ordre d'affichage
            <FieldHint>numéro libre dans cette galerie ; prochain numéro : {nextOrder}</FieldHint>
            <input type="number" min="0" step="1" value={order} placeholder={String(nextOrder)}
              onChange={(event) => setOrder(event.target.value)} className="min-h-11 w-full border border-border bg-background px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">Cadrage horizontal (%)
              <input type="number" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))}
                className="min-h-11 w-full border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">Cadrage vertical (%)
              <input type="number" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))}
                className="min-h-11 w-full border border-border bg-background px-3 py-2" />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          Publier cet emplacement<FieldHint>visible dans la galerie après activation de Storage</FieldHint>
        </label>
        <button type="submit" disabled={!storageReady || uploading}
          className="min-h-11 bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
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
            allPlacements={placements ?? []}
            onPlacementDirtyChange={(id, dirty) => setDirty(`placement:${id}`, dirty)}
            onDirtyChange={(dirty) => setDirty(p.id, dirty)}
          />
        ))}
      </div>
      {photosUnavailable && <p role="alert" className="text-sm text-destructive">La liste des photos ne peut pas être chargée.</p>}
      {photos && photos.length === 0 && (
        <p className="text-sm text-muted-foreground p-12 text-center bg-surface border border-border">
          Aucune photo. Cliquez sur « Ajouter une photo » pour commencer.
        </p>
      )}
    </div>
  );
}

function PhotoCard({
  item,
  categories,
  seoPages,
  placements,
  variants,
  storageReady,
  allPlacements,
  onPlacementDirtyChange,
  onDirtyChange,
}: {
  item: PhotoWithCategory;
  categories: CategoryRow[];
  seoPages: SeoPage[];
  placements: Placement[];
  variants: PhotoVariant[];
  storageReady: boolean;
  allPlacements: Placement[];
  onPlacementDirtyChange: (id: string, dirty: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
}) {
  const qc = useQueryClient();
  // The joined `category` field isn't a real column — keep it out of the
  // editable draft so it's never sent back in an update patch.
  const { category: _category, ...editable } = item;
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    editable,
    async (patch) => {
      const { error } = await supabase.from("photos").update(patch).eq("id", item.id);
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      return { error };
    },
    onDirtyChange,
  );

  async function remove() {
    if (!confirmDelete("cette photo")) return;
    if (!storageReady) return toast.error("Attendez que la bibliothèque de photos soit disponible.");
    const legacyPath = variants.length === 0 ? legacyStoragePath(item.image_url) : null;
    let paths: string[] = [];
    let cleanupJobId: string | null = null;
    let photoDeleted = false;
    try {
      const { data, error } = await supabase.rpc("admin_delete_photo", {
        p_photo_id: item.id,
        p_legacy_path: legacyPath,
      });
      queryError(error);
      const deletion = data as { cleanup_job_id: string | null; object_paths: string[] };
      cleanupJobId = deletion.cleanup_job_id;
      paths = deletion.object_paths ?? [];
      photoDeleted = true;
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("photos").remove(paths);
        if (storageError) {
          if (cleanupJobId) {
            await supabase.rpc("admin_finish_photo_cleanup", {
              p_job_id: cleanupJobId,
              p_error: storageError.message,
            });
          }
          throw storageError;
        }
      }
      if (cleanupJobId) {
        queryError((await supabase.rpc("admin_finish_photo_cleanup", {
          p_job_id: cleanupJobId,
          p_error: null,
        })).error);
      }
      toast.success("Photo et fichiers supprimés");
    } catch (error) {
      console.error("Suppression de la photo incomplète", { error, paths });
      toast.error(photoDeleted
        ? "La photo est retirée, mais certains fichiers n'ont pas pu être supprimés. Demandez une vérification du stockage."
        : "La suppression n'a pas pu être terminée. Vérifiez la bibliothèque avant de réessayer.");
    } finally {
      qc.invalidateQueries({ queryKey: ["admin-photos"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-variants"] });
      qc.invalidateQueries({ queryKey: ["admin-photo-storage-capacity"] });
    }
  }

  function savePhoto() {
    if (!draft.alt_text.trim()) return toast.error("Le texte alternatif est obligatoire.");
    void save();
  }

  return (
    <div className="bg-surface border border-border overflow-hidden">
      <img
        src={item.image_url}
        alt={item.alt_text}
        width={400}
        height={500}
        className="w-full aspect-[4/5] object-cover"
        loading="lazy"
      />
      <div className="p-4 space-y-2 text-sm">
        <label htmlFor={`photo-alt-${item.id}`} className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Texte alternatif
          <FieldHint>description de la photo pour Google et les personnes malvoyantes</FieldHint>
        </label>
        <input
          id={`photo-alt-${item.id}`}
          value={draft.alt_text}
          onChange={(e) => setField("alt_text", e.target.value)}
          placeholder="Ex. Séance grossesse en forêt au coucher du soleil"
          required
          maxLength={300}
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        />
        <label htmlFor={`photo-location-${item.id}`} className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Lieu
          <FieldHint>lieu de la séance, affiché en superposition sur la photo</FieldHint>
        </label>
        <input
          id={`photo-location-${item.id}`}
          value={draft.location ?? ""}
          onChange={(e) => setField("location", e.target.value)}
          placeholder="Ex. Lyon"
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        />
        <label htmlFor={`photo-category-${item.id}`} className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Catégorie
          <FieldHint>classe la photo parmi les types de séances</FieldHint>
        </label>
        <select
          id={`photo-category-${item.id}`}
          value={draft.category_id ?? ""}
          onChange={(e) => setField("category_id", e.target.value || null)}
          className="min-h-11 w-full bg-background border border-border px-2 py-2 text-xs"
        >
          <option value="">— Catégorie —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3 text-xs pt-1">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setField("published", e.target.checked)}
            />
            Publié
            <FieldHint>visible sur le site</FieldHint>
          </label>
          {/* Accueil / Portfolio restent masqués : les pages concernées ne lisent pas ces colonnes. */}
        </div>
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={remove} disabled={!storageReady}
            className="min-h-11 text-xs text-destructive hover:underline disabled:opacity-50">
            Supprimer
          </button>
          <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={savePhoto} className="min-h-11" />
        </div>
        {placements.map((placement) => (
          <PlacementEditor key={placement.id} placement={placement} seoPages={seoPages}
            allPlacements={allPlacements} onDirtyChange={(dirty) => onPlacementDirtyChange(placement.id, dirty)} />
        ))}
        {storageReady && variants.some((variant) => variant.format === "avif") &&
          variants.some((variant) => variant.format === "webp") && (
            <NewPlacementForm photoId={item.id} seoPages={seoPages} allPlacements={allPlacements} />
          )}
      </div>
    </div>
  );
}

function NewPlacementForm({ photoId, seoPages, allPlacements }: {
  photoId: string;
  seoPages: SeoPage[];
  allPlacements: Placement[];
}) {
  const qc = useQueryClient();
  const [seoPageId, setSeoPageId] = useState("");
  const [slot, setSlot] = useState("gallery-1");
  const [order, setOrder] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const page = seoPages.find((item) => item.id === seoPageId);
  const slots = page ? GALLERY_SLOTS[page.slug] : ["gallery-1"];
  const nextOrder = Math.max(-1, ...allPlacements
    .filter((item) => item.seo_page_id === seoPageId && item.slot === slot)
    .map((item) => item.display_order)) + 1;

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !page || !slots.includes(slot)) return;
    const displayOrder = order.trim() ? Number(order) : nextOrder;
    if (!Number.isSafeInteger(displayOrder) || displayOrder < 0 ||
      allPlacements.some((item) => item.seo_page_id === seoPageId && item.slot === slot && item.display_order === displayOrder)) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (![x, y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
      return toast.error("Le cadrage doit être compris entre 0 et 100 %.");
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("photo_placements").insert({
        placement_key: `seo/${page.slug}/${slot}/${crypto.randomUUID().replaceAll("-", "")}`,
        photo_id: photoId,
        context_type: "seo",
        seo_page_id: seoPageId,
        slot,
        display_order: displayOrder,
        object_position_x_pct: x,
        object_position_y_pct: y,
        published,
      });
      queryError(error);
      toast.success("Emplacement ajouté");
      setOrder("");
      qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
    } catch (error) {
      toast.error(friendlySupabaseError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="border-t border-border pt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-xs underline underline-offset-2">Ajouter à une autre galerie</summary>
      <form onSubmit={add} className="space-y-2 py-2">
        <label className="block text-xs">Page SEO
          <select required value={seoPageId} onChange={(event) => { setSeoPageId(event.target.value); setSlot("gallery-1"); setOrder(""); }}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2">
            <option value="">Choisir une page</option>
            {seoPages.map((item) => <option key={item.id} value={item.id}>{item.h1}{item.published ? "" : " (non publiée)"}</option>)}
          </select>
        </label>
        <label className="block text-xs">Galerie
          <select value={slot} onChange={(event) => { setSlot(event.target.value); setOrder(""); }}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2">
            {slots.map((item) => <option key={item} value={item}>Galerie {item.split("-")[1]}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Ordre
            <input type="number" min="0" step="1" value={order} placeholder={String(nextOrder)}
              onChange={(event) => setOrder(event.target.value)} className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
          </label>
          <label className="text-xs">Cadrage X (%)
            <input type="number" min="0" max="100" value={x} onChange={(event) => setX(Number(event.target.value))}
              className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
          </label>
          <label className="text-xs">Cadrage Y (%)
            <input type="number" min="0" max="100" value={y} onChange={(event) => setY(Number(event.target.value))}
              className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={published}
          onChange={(event) => setPublished(event.target.checked)} />Publier cet emplacement</label>
        <button type="submit" disabled={saving} className="min-h-11 bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50">
          {saving ? "Ajout…" : "Ajouter l'emplacement"}
        </button>
      </form>
    </details>
  );
}

function PlacementEditor({
  placement,
  seoPages,
  allPlacements,
  onDirtyChange,
}: {
  placement: Placement;
  seoPages: SeoPage[];
  allPlacements: Placement[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const { draft, setField, isDirty, isSaving, save } = useEditableRecord(
    placement,
    async (patch) => {
      const { error } = await supabase.from("photo_placements")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", placement.id);
      if (!error) qc.invalidateQueries({ queryKey: ["admin-photo-placements"] });
      return { error };
    },
    onDirtyChange,
  );
  const page = seoPages.find((item) => item.id === draft.seo_page_id);
  const slots = page ? GALLERY_SLOTS[page.slug] : [draft.slot];

  function savePlacement() {
    if (!page || !slots.includes(draft.slot)) return toast.error("Choisissez une galerie valide.");
    if (!Number.isSafeInteger(Number(draft.display_order)) || Number(draft.display_order) < 0 ||
        allPlacements.some((item) => item.id !== placement.id && item.seo_page_id === draft.seo_page_id &&
          item.slot === draft.slot && item.display_order === Number(draft.display_order))) {
      return toast.error("Cet ordre est déjà utilisé ou invalide pour cette galerie.");
    }
    if (![draft.object_position_x_pct, draft.object_position_y_pct]
      .every((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
      return toast.error("Le cadrage doit être compris entre 0 et 100 %.");
    }
    void save();
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider">Emplacement dans une galerie</h3>
      <label className="block text-xs">Page SEO
        <select value={draft.seo_page_id} onChange={(event) => { setField("seo_page_id", event.target.value); setField("slot", "gallery-1"); }}
          className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2">
          {seoPages.map((item) => <option key={item.id} value={item.id}>{item.h1}{item.published ? "" : " (non publiée)"}</option>)}
        </select>
      </label>
      <label className="block text-xs">Galerie
        <select value={draft.slot} onChange={(event) => setField("slot", event.target.value)}
          className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2">
          {slots.map((item) => <option key={item} value={item}>Galerie {item.split("-")[1]}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">Ordre
          <input type="number" min="0" step="1" value={draft.display_order}
            onChange={(event) => setField("display_order", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
        </label>
        <label className="text-xs">Cadrage X (%)
          <input type="number" min="0" max="100" value={draft.object_position_x_pct}
            onChange={(event) => setField("object_position_x_pct", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
        </label>
        <label className="text-xs">Cadrage Y (%)
          <input type="number" min="0" max="100" value={draft.object_position_y_pct}
            onChange={(event) => setField("object_position_y_pct", Number(event.target.value))}
            className="mt-1 min-h-11 w-full border border-border bg-background px-2 py-2" />
        </label>
      </div>
      <FieldHint>0 % place le sujet en haut ou à gauche ; 100 % en bas ou à droite.</FieldHint>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.published}
        onChange={(event) => setField("published", event.target.checked)} />Publié dans la galerie</label>
      <SaveButton isDirty={isDirty} isSaving={isSaving} onClick={savePlacement} className="min-h-11" />
    </div>
  );
}

type CapacityData = Awaited<ReturnType<typeof getPhotoStorageCapacity>>;

function PhotoStorageCapacityPanel({
  capacity,
  unavailable,
  onRefresh,
}: {
  capacity: CapacityData | undefined;
  unavailable: boolean;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const level = capacity?.usagePercent === null || capacity?.usagePercent === undefined
    ? "unknown"
    : capacity.usagePercent >= 95
      ? "critical"
      : capacity.usagePercent >= 85
        ? "warning"
        : capacity.usagePercent >= 70
          ? "info"
          : "normal";

  async function cleanupOrphans() {
    if (!capacity?.orphanCount || !confirmDelete(`${capacity.orphanCount} variante(s) inutilisée(s) depuis plus de 24 h`)) return;
    setBusy(true);
    try {
      const result = await cleanupOrphanPhotoVariants();
      toast.success(`${result.removed} variante(s) orpheline(s) supprimée(s).`);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nettoyage des variantes impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function retryCleanup() {
    setBusy(true);
    try {
      const result = await retryPhotoStorageCleanup();
      toast.success(`${result.completed} nettoyage(s) terminé(s) ; ${result.pending} en attente.`);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reprise du nettoyage impossible.");
    } finally {
      setBusy(false);
    }
  }

  const message = level === "critical"
    ? "Alerte critique : le stockage photo a atteint 95 % de la limite configurée. Supprimez d’anciennes photos, nettoyez les variantes inutilisées/orphelines ou augmentez la capacité Supabase."
    : level === "warning"
      ? "Avertissement important : le stockage photo a atteint 85 %. Vous pouvez supprimer d’anciennes photos, nettoyer les variantes inutilisées/orphelines ou augmenter la capacité Supabase."
      : level === "info"
        ? "Information : le stockage photo a atteint 70 % de la limite configurée. Pensez à contrôler les photos anciennes et les variantes inutilisées."
        : null;

  return (
    <section className="space-y-3 border border-border bg-surface p-4 sm:p-6" aria-labelledby="photo-storage-capacity-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="photo-storage-capacity-title" className="font-display text-2xl italic text-primary">Stockage des photos</h2>
          <p className="text-sm text-muted-foreground">Utilisation réelle de tous les buckets du projet ; le détail du bucket photos est indiqué séparément.</p>
        </div>
        <button type="button" onClick={onRefresh} className="min-h-11 border border-border px-3 py-2 text-sm">Actualiser</button>
      </div>
      {unavailable ? (
        <p role="status" className="text-sm text-muted-foreground">
          Le suivi sera disponible après l’application de la migration Photos 00005 et une session admin aal2.
        </p>
      ) : capacity ? (
        <>
          {message && <p role={level === "critical" ? "alert" : "status"} className="text-sm">{message}</p>}
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-muted-foreground">Utilisé</dt><dd className="font-semibold">{formatStorageBytes(capacity.usedBytes)}</dd></div>
            <div><dt className="text-muted-foreground">Bucket photos</dt><dd className="font-semibold">{formatStorageBytes(capacity.photoBucketBytes)} · {capacity.photoBucketObjectCount} fichiers</dd></div>
            <div><dt className="text-muted-foreground">Limite configurée</dt><dd className="font-semibold">{capacity.limitBytes === null ? "À configurer" : formatStorageBytes(capacity.limitBytes)}</dd></div>
            <div><dt className="text-muted-foreground">Restant</dt><dd className="font-semibold">{capacity.remainingBytes === null ? "À configurer" : formatStorageBytes(capacity.remainingBytes)}</dd></div>
            <div><dt className="text-muted-foreground">Taux utilisé</dt><dd className="font-semibold">{capacity.usagePercent === null ? "Limite à configurer" : `${capacity.usagePercent.toFixed(1)} %`}</dd></div>
            <div><dt className="text-muted-foreground">Moyenne des variantes d’une photo complète</dt><dd className="font-semibold">{formatStorageBytes(capacity.averagePhotoBytes)}</dd></div>
            <div><dt className="text-muted-foreground">Photos supplémentaires estimées</dt><dd className="font-semibold">{capacity.estimatedAdditionalPhotos === null ? "Indisponible" : `≈ ${capacity.estimatedAdditionalPhotos}`}</dd></div>
          </dl>
          {capacity.usagePercent !== null && (
            <div
              className="h-3 overflow-hidden rounded bg-muted"
              role="progressbar"
              aria-label="Capacité de stockage photo utilisée"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.max(0, capacity.usagePercent))}
            >
              <div className={`h-full ${level === "critical" ? "bg-destructive" : level === "warning" ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, Math.max(0, capacity.usagePercent))}%` }} />
            </div>
          )}
          {capacity.usagePercent === null && <p className="text-sm">Configurez PHOTOS_STORAGE_LIMIT_BYTES côté serveur pour afficher le taux et les estimations.</p>}
          {capacity.configurationError && <p role="status" className="text-sm">{capacity.configurationError}</p>}
          {capacity.criticalUploadMode === "block" && level === "critical" && (
            <p className="text-sm font-medium">Mode configuré : empêcher un nouvel envoi si ses variantes feraient dépasser la limite.</p>
          )}
          {capacity.missingVariantCount > 0 && <p role="alert" className="text-sm">{capacity.missingVariantCount} variante(s) référencée(s) en base manque(nt) dans Storage ; vérifiez avant toute suppression.</p>}
          {capacity.pendingCleanupCount > 0 && (
            <button type="button" disabled={busy} onClick={() => void retryCleanup()}
              className="min-h-11 border border-border px-3 py-2 text-sm disabled:opacity-50">
              Reprendre le nettoyage de {capacity.pendingCleanupCount} photo(s)
            </button>
          )}
          {capacity.orphanCount > 0 && (
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <span>{capacity.orphanCount} variante(s) orpheline(s) après le délai de sécurité, {formatStorageBytes(capacity.orphanBytes)}.</span>
              <button type="button" disabled={busy} onClick={() => void cleanupOrphans()}
                className="min-h-11 border border-border px-3 py-2 disabled:opacity-50">
                Nettoyer les variantes orphelines
              </button>
            </p>
          )}
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">Chargement de la capacité Storage…</p>
      )}
    </section>
  );
}
