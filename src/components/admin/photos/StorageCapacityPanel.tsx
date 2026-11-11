import { toast } from "sonner";
import { useState } from "react";
import { confirmDelete } from "@/lib/admin/confirm-delete";
import {
  cleanupOrphanPhotoVariants,
  getPhotoStorageCapacity,
  retryPhotoStorageCleanup,
} from "@/lib/photos/storage-admin.functions";
import { formatStorageBytes } from "./helpers";

type CapacityData = Awaited<ReturnType<typeof getPhotoStorageCapacity>>;

export function PhotoStorageCapacityPanel({
  capacity,
  unavailable,
  onRefresh,
}: {
  capacity: CapacityData | undefined;
  unavailable: boolean;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const level =
    capacity?.usagePercent === null || capacity?.usagePercent === undefined
      ? "unknown"
      : capacity.usagePercent >= 95
        ? "critical"
        : capacity.usagePercent >= 85
          ? "warning"
          : capacity.usagePercent >= 70
            ? "info"
            : "normal";

  async function cleanupOrphans() {
    if (
      !capacity?.orphanCount ||
      !confirmDelete(`${capacity.orphanCount} variante(s) inutilisée(s) depuis plus de 24 h`)
    )
      return;
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

  const message =
    level === "critical"
      ? "Alerte critique : le stockage photo a atteint 95 % de la limite configurée. Supprimez d’anciennes photos, nettoyez les variantes inutilisées/orphelines ou augmentez la capacité Supabase."
      : level === "warning"
        ? "Avertissement important : le stockage photo a atteint 85 %. Vous pouvez supprimer d’anciennes photos, nettoyer les variantes inutilisées/orphelines ou augmenter la capacité Supabase."
        : level === "info"
          ? "Information : le stockage photo a atteint 70 % de la limite configurée. Pensez à contrôler les photos anciennes et les variantes inutilisées."
          : null;

  return (
    <section
      className="space-y-3 border border-border bg-surface p-4 sm:p-6"
      aria-labelledby="photo-storage-capacity-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="photo-storage-capacity-title"
            className="font-display text-2xl italic text-primary"
          >
            Stockage des photos
          </h2>
          <p className="text-sm text-muted-foreground">
            Utilisation réelle de tous les buckets du projet ; le détail du bucket photos est
            indiqué séparément.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 border border-border px-3 py-2 text-sm"
        >
          Actualiser
        </button>
      </div>
      {unavailable ? (
        <p role="status" className="text-sm text-muted-foreground">
          Le suivi sera disponible après l’application de la migration Photos 00005 et une session
          admin aal2.
        </p>
      ) : capacity ? (
        <>
          {message && (
            <p role={level === "critical" ? "alert" : "status"} className="text-sm">
              {message}
            </p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Utilisé</dt>
              <dd className="font-semibold">{formatStorageBytes(capacity.usedBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bucket photos</dt>
              <dd className="font-semibold">
                {formatStorageBytes(capacity.photoBucketBytes)} · {capacity.photoBucketObjectCount}{" "}
                fichiers
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Limite configurée</dt>
              <dd className="font-semibold">
                {capacity.limitBytes === null
                  ? "À configurer"
                  : formatStorageBytes(capacity.limitBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Restant</dt>
              <dd className="font-semibold">
                {capacity.remainingBytes === null
                  ? "À configurer"
                  : formatStorageBytes(capacity.remainingBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Taux utilisé</dt>
              <dd className="font-semibold">
                {capacity.usagePercent === null
                  ? "Limite à configurer"
                  : `${capacity.usagePercent.toFixed(1)} %`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Moyenne des variantes d’une photo complète</dt>
              <dd className="font-semibold">{formatStorageBytes(capacity.averagePhotoBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Photos supplémentaires estimées</dt>
              <dd className="font-semibold">
                {capacity.estimatedAdditionalPhotos === null
                  ? "Indisponible"
                  : `≈ ${capacity.estimatedAdditionalPhotos}`}
              </dd>
            </div>
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
              <div
                className={`h-full ${level === "critical" ? "bg-destructive" : level === "warning" ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, Math.max(0, capacity.usagePercent))}%` }}
              />
            </div>
          )}
          {capacity.usagePercent === null && (
            <p className="text-sm">
              Configurez PHOTOS_STORAGE_LIMIT_BYTES côté serveur pour afficher le taux et les
              estimations.
            </p>
          )}
          {capacity.configurationError && (
            <p role="status" className="text-sm">
              {capacity.configurationError}
            </p>
          )}
          {capacity.criticalUploadMode === "block" && level === "critical" && (
            <p className="text-sm font-medium">
              Mode configuré : empêcher un nouvel envoi si ses variantes feraient dépasser la
              limite.
            </p>
          )}
          {capacity.missingVariantCount > 0 && (
            <p role="alert" className="text-sm">
              {capacity.missingVariantCount} variante(s) référencée(s) en base manque(nt) dans
              Storage ; vérifiez avant toute suppression.
            </p>
          )}
          {capacity.pendingCleanupCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void retryCleanup()}
              className="min-h-11 border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Reprendre le nettoyage de {capacity.pendingCleanupCount} photo(s)
            </button>
          )}
          {capacity.orphanCount > 0 && (
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                {capacity.orphanCount} variante(s) orpheline(s) après le délai de sécurité,{" "}
                {formatStorageBytes(capacity.orphanBytes)}.
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void cleanupOrphans()}
                className="min-h-11 border border-border px-3 py-2 disabled:opacity-50"
              >
                Nettoyer les variantes orphelines
              </button>
            </p>
          )}
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Chargement de la capacité Storage…
        </p>
      )}
    </section>
  );
}
